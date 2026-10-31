from django.core import mail
from django.test import TestCase

from apps.bookings.models import Booking
from apps.bookings.notifications import EmailBookingNotifier

from .factories import local_time, make_space, make_user


class EmailNotifierTests(TestCase):
    def setUp(self):
        self.booking = Booking.objects.create(
            user=make_user(), space=make_space(name="Huddle Room"),
            start_at=local_time(1, 10), end_at=local_time(1, 11), total_price="200.00",
        )
        self.notifier = EmailBookingNotifier()

    def test_each_event_sends_one_email_to_the_booker(self):
        events = [
            (self.notifier.booking_confirmed, "Booking confirmed: Huddle Room"),
            (self.notifier.booking_awaiting_approval, "Request received: Huddle Room"),
            (self.notifier.booking_rejected, "Request declined: Huddle Room"),
            (self.notifier.booking_cancelled, "Booking cancelled: Huddle Room"),
        ]
        for send, subject in events:
            send(self.booking)

        self.assertEqual([m.subject for m in mail.outbox], [subject for _, subject in events])
        self.assertTrue(all(m.to == ["asha@example.com"] for m in mail.outbox))

    def test_confirmation_includes_time_and_price(self):
        self.notifier.booking_confirmed(self.booking)
        body = mail.outbox[0].body
        self.assertIn("10:00-11:00", body)
        self.assertIn("INR 200.00", body)
