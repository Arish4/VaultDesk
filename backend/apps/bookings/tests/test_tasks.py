from django.core import mail
from django.test import TestCase

from apps.bookings import tasks
from apps.bookings.models import Booking

from .factories import local_time, make_space, make_user


class TaskTests(TestCase):
    def setUp(self):
        self.booking = Booking.objects.create(
            user=make_user(), space=make_space(), start_at=local_time(1, 10), end_at=local_time(1, 11), total_price="200.00"
        )

    def test_reminder_is_sent_for_confirmed_booking(self):
        tasks.send_booking_reminder(self.booking.id)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Starting soon", mail.outbox[0].subject)

    def test_reminder_is_skipped_after_cancellation(self):
        self.booking.status = Booking.Status.CANCELLED
        self.booking.save()
        tasks.send_booking_reminder(self.booking.id)
        self.assertEqual(mail.outbox, [])

    def test_missing_booking_is_ignored(self):
        tasks.send_booking_confirmation(999_999)
        self.assertEqual(mail.outbox, [])
