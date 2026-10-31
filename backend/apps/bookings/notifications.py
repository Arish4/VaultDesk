"""Telling users about their bookings.

Dependency Inversion: the booking service depends on the BookingNotifier interface,
not on Celery or email. Tests pass a fake notifier; production passes CeleryBookingNotifier.
"""
from datetime import timedelta
from typing import Protocol

from django.utils import timezone

from .models import Booking
from . import tasks

REMINDER_BEFORE_START = timedelta(minutes=30)


class BookingNotifier(Protocol):
    def booking_confirmed(self, booking: Booking) -> None: ...

    def booking_awaiting_approval(self, booking: Booking) -> None: ...

    def booking_rejected(self, booking: Booking) -> None: ...

    def booking_cancelled(self, booking: Booking) -> None: ...


class CeleryBookingNotifier:
    """Queues emails as background jobs so the API response never waits for SMTP."""

    def booking_confirmed(self, booking: Booking) -> None:
        tasks.send_booking_confirmation.delay(booking.id)  # pass the id, never the object
        remind_at = booking.start_at - REMINDER_BEFORE_START
        if remind_at > timezone.now():
            tasks.send_booking_reminder.apply_async(args=[booking.id], eta=remind_at)

    def booking_awaiting_approval(self, booking: Booking) -> None:
        tasks.send_booking_request_received.delay(booking.id)

    def booking_rejected(self, booking: Booking) -> None:
        tasks.send_booking_rejection.delay(booking.id)

    def booking_cancelled(self, booking: Booking) -> None:
        tasks.send_booking_cancellation.delay(booking.id)
