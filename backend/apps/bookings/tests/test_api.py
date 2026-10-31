from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.bookings.models import Booking

from .factories import local_time, make_space, make_user


class BookingApiTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.space = make_space()
        self.client.force_authenticate(self.user)

    def payload(self, start_hour=10, end_hour=12):
        return {
            "space_id": self.space.id,
            "start_at": local_time(1, start_hour).isoformat(),
            "end_at": local_time(1, end_hour).isoformat(),
        }

    def test_requires_login(self):
        self.client.force_authenticate(None)
        response = self.client.get(reverse("booking-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_booking_sends_confirmation_email(self):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(reverse("booking-list"), self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_price"], "400.00")
        self.assertEqual(response.data["space"]["id"], self.space.id)
        # Celery runs eagerly in tests, so the email is "sent" to the in-memory outbox.
        self.assertTrue(any("Booking confirmed" in m.subject for m in mail.outbox))

    def test_double_booking_returns_409(self):
        self.client.post(reverse("booking-list"), self.payload(10, 12), format="json")
        response = self.client.post(reverse("booking-list"), self.payload(11, 13), format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "slot_unavailable")

    def test_validation_error_returns_400(self):
        response = self.client.post(reverse("booking-list"), self.payload(12, 10), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_at", response.data)

    def test_lists_only_my_bookings(self):
        self.client.post(reverse("booking-list"), self.payload(10, 11), format="json")
        other = make_user("ravi")
        Booking.objects.create(
            user=other, space=self.space, start_at=local_time(2, 10), end_at=local_time(2, 11), total_price="200.00"
        )

        response = self.client.get(reverse("booking-list"))
        self.assertEqual(response.data["count"], 1)

    def test_cancel(self):
        booking_id = self.client.post(reverse("booking-list"), self.payload(), format="json").data["id"]
        response = self.client.post(reverse("booking-cancel", args=[booking_id]))
        self.assertEqual(response.data["status"], "cancelled")

    def test_availability_is_public_and_hides_who_booked(self):
        self.client.post(reverse("booking-list"), self.payload(10, 12), format="json")
        self.client.force_authenticate(None)

        day = local_time(1, 0).date().isoformat()
        response = self.client.get(reverse("space-availability", args=[self.space.id]), {"date": day})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["booked"]), 1)
        self.assertEqual(set(response.data["booked"][0]), {"start_at", "end_at"})
