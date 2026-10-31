from decimal import Decimal

from django.test import TestCase

from apps.bookings.exceptions import (
    BookingNotCancellable,
    BookingNotFound,
    InvalidBookingWindow,
    OutsideOpeningHours,
    SlotUnavailable,
    SpaceNotFound,
)
from apps.bookings.models import Booking
from apps.bookings.pricing import HourlyPricing
from apps.bookings.services import BookingService

from .factories import FakeNotifier, local_time, make_space, make_user


class BookingServiceTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.space = make_space()
        self.notifier = FakeNotifier()
        self.service = BookingService(pricing=HourlyPricing(), notifier=self.notifier)

    def book(self, start_hour: int, end_hour: int, user=None):
        return self.service.create(
            user=user or self.user,
            space_id=self.space.id,
            start_at=local_time(1, start_hour),
            end_at=local_time(1, end_hour),
        )

    def test_creates_booking_with_price_and_notifies(self):
        with self.captureOnCommitCallbacks(execute=True):
            booking = self.book(10, 12)

        self.assertEqual(booking.total_price, Decimal("400.00"))  # 2h × ₹200
        self.assertEqual(booking.status, Booking.Status.CONFIRMED)
        self.assertEqual(self.notifier.confirmed, [booking.id])

    def test_notification_failure_does_not_lose_the_booking(self):
        class BrokenNotifier(FakeNotifier):
            def booking_confirmed(self, booking):
                raise ConnectionError("broker is down")

        service = BookingService(pricing=HourlyPricing(), notifier=BrokenNotifier())
        with self.assertLogs(level="ERROR"):  # the failure is logged, not raised
            with self.captureOnCommitCallbacks(execute=True):
                booking = service.create(
                    user=self.user, space_id=self.space.id, start_at=local_time(1, 10), end_at=local_time(1, 11)
                )
        self.assertTrue(Booking.objects.filter(pk=booking.pk).exists())

    def test_half_hour_pricing(self):
        booking = self.service.create(
            user=self.user, space_id=self.space.id, start_at=local_time(1, 10), end_at=local_time(1, 11, 30)
        )
        self.assertEqual(booking.total_price, Decimal("300.00"))

    def test_rejects_overlapping_booking(self):
        self.book(10, 12)
        with self.assertRaises(SlotUnavailable):
            self.book(11, 13, user=make_user("ravi"))

    def test_allows_back_to_back_bookings(self):
        self.book(10, 11)
        second = self.book(11, 12, user=make_user("ravi"))
        self.assertEqual(second.status, Booking.Status.CONFIRMED)

    def test_same_time_in_another_space_is_fine(self):
        self.book(10, 12)
        other = make_space(location=self.space.location, name="Desk 2")
        booking = self.service.create(
            user=self.user, space_id=other.id, start_at=local_time(1, 10), end_at=local_time(1, 12)
        )
        self.assertEqual(booking.space, other)

    def test_rejects_end_before_start(self):
        with self.assertRaises(InvalidBookingWindow):
            self.book(12, 10)

    def test_rejects_past_booking(self):
        with self.assertRaises(InvalidBookingWindow):
            self.service.create(
                user=self.user, space_id=self.space.id, start_at=local_time(-1, 10), end_at=local_time(-1, 11)
            )

    def test_rejects_outside_opening_hours(self):
        with self.assertRaises(OutsideOpeningHours):
            self.book(6, 9)  # centre opens at 08:00

    def test_rejects_inactive_space(self):
        self.space.is_active = False
        self.space.save()
        with self.assertRaises(SpaceNotFound):
            self.book(10, 11)

    def test_cancel_frees_the_slot_and_notifies(self):
        booking = self.book(10, 12)
        with self.captureOnCommitCallbacks(execute=True):
            self.service.cancel(user=self.user, booking_id=booking.id)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        self.assertEqual(self.notifier.cancelled, [booking.id])
        self.assertEqual(self.book(10, 12, user=make_user("ravi")).status, Booking.Status.CONFIRMED)

    def test_cannot_cancel_someone_elses_booking(self):
        booking = self.book(10, 12)
        with self.assertRaises(BookingNotFound):
            self.service.cancel(user=make_user("ravi"), booking_id=booking.id)

    def test_cannot_cancel_twice(self):
        booking = self.book(10, 12)
        self.service.cancel(user=self.user, booking_id=booking.id)
        with self.assertRaises(BookingNotCancellable):
            self.service.cancel(user=self.user, booking_id=booking.id)
