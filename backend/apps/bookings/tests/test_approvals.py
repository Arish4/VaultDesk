from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.bookings.exceptions import BookingNotReviewable, SlotUnavailable, SpaceOutOfService, TooManyAttendees
from apps.bookings.models import Booking
from apps.bookings.pricing import HourlyPricing
from apps.bookings.services import BookingService
from apps.maintenance.models import Issue

from .factories import FakeNotifier, local_time, make_space, make_user


class ApprovalRulesTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.manager = make_user("manager", is_staff=True)
        self.hall = make_space(name="Auditorium", capacity=100, requires_approval=True)
        self.notifier = FakeNotifier()
        self.service = BookingService(pricing=HourlyPricing(), notifier=self.notifier)

    def request_hall(self, user=None, start=10, end=12):
        return self.service.create(
            user=user or self.user, space_id=self.hall.id, start_at=local_time(1, start), end_at=local_time(1, end)
        )

    def test_rooms_needing_approval_start_pending(self):
        with self.captureOnCommitCallbacks(execute=True):
            booking = self.request_hall()
        self.assertEqual(booking.status, Booking.Status.PENDING)
        self.assertEqual(self.notifier.awaiting, [booking.id])
        self.assertEqual(self.notifier.confirmed, [])

    def test_pending_request_holds_the_slot(self):
        self.request_hall()
        with self.assertRaises(SlotUnavailable):
            self.request_hall(user=make_user("ravi"), start=11, end=13)

    def test_approve_confirms_and_records_reviewer(self):
        booking = self.request_hall()
        with self.captureOnCommitCallbacks(execute=True):
            approved = self.service.approve(reviewer=self.manager, booking_id=booking.id)
        self.assertEqual(approved.status, Booking.Status.CONFIRMED)
        self.assertEqual(approved.reviewed_by, self.manager)
        self.assertEqual(self.notifier.confirmed, [booking.id])

    def test_reject_frees_the_slot(self):
        booking = self.request_hall()
        with self.captureOnCommitCallbacks(execute=True):
            self.service.reject(reviewer=self.manager, booking_id=booking.id)
        self.assertEqual(self.notifier.rejected, [booking.id])
        self.assertEqual(self.request_hall(user=make_user("ravi")).status, Booking.Status.PENDING)

    def test_cannot_review_twice(self):
        booking = self.request_hall()
        self.service.approve(reviewer=self.manager, booking_id=booking.id)
        with self.assertRaises(BookingNotReviewable):
            self.service.reject(reviewer=self.manager, booking_id=booking.id)

    def test_attendees_cannot_exceed_capacity(self):
        with self.assertRaises(TooManyAttendees):
            self.service.create(
                user=self.user, space_id=self.hall.id,
                start_at=local_time(1, 10), end_at=local_time(1, 11), attendees=101,
            )

    def test_out_of_service_room_cannot_be_booked(self):
        Issue.objects.create(space=self.hall, title="Broken stage", blocks_booking=True)
        with self.assertRaises(SpaceOutOfService):
            self.request_hall()

    def test_resolved_issue_no_longer_blocks(self):
        Issue.objects.create(space=self.hall, title="Broken stage", blocks_booking=True, status=Issue.Status.RESOLVED)
        self.assertEqual(self.request_hall().status, Booking.Status.PENDING)


class ApprovalApiTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.manager = make_user("manager", is_staff=True)
        self.hall = make_space(name="Auditorium", capacity=100, requires_approval=True)
        self.client.force_authenticate(self.user)
        self.booking_id = self.client.post(reverse("booking-list"), {
            "space_id": self.hall.id, "title": "Town hall", "attendees": 80,
            "start_at": local_time(1, 10).isoformat(), "end_at": local_time(1, 12).isoformat(),
        }, format="json").data["id"]

    def test_members_cannot_see_or_decide_approvals(self):
        self.assertEqual(self.client.get(reverse("approval-list")).status_code, status.HTTP_403_FORBIDDEN)
        response = self.client.post(reverse("booking-approve", args=[self.booking_id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_sees_queue_and_approves(self):
        self.client.force_authenticate(self.manager)
        queue = self.client.get(reverse("approval-list")).data
        self.assertEqual(queue["count"], 1)
        self.assertEqual(queue["results"][0]["requested_by"], "asha")
        self.assertEqual(queue["results"][0]["title"], "Town hall")

        response = self.client.post(reverse("booking-approve", args=[self.booking_id]))
        self.assertEqual(response.data["status"], "confirmed")
        self.assertEqual(self.client.get(reverse("approval-list")).data["count"], 0)
