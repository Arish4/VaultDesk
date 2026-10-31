"""Telling users about their bookings.

Dependency Inversion: the booking service depends on the BookingNotifier interface,
not on email. Tests pass a fake notifier; production passes EmailBookingNotifier.
Another channel (SMS, Slack, a job queue) would be a new class; the service wouldn't change.
"""
from typing import Protocol

from django.core.mail import send_mail
from django.utils import timezone

from .models import Booking


class BookingNotifier(Protocol):
    def booking_confirmed(self, booking: Booking) -> None: ...

    def booking_awaiting_approval(self, booking: Booking) -> None: ...

    def booking_rejected(self, booking: Booking) -> None: ...

    def booking_cancelled(self, booking: Booking) -> None: ...


def _when(booking: Booking) -> str:
    start = timezone.localtime(booking.start_at)
    end = timezone.localtime(booking.end_at)
    return f"{start:%a %d %b, %H:%M}-{end:%H:%M}"


class EmailBookingNotifier:
    """Sends a plain email for each event. Called after the booking is saved (see BookingService)."""

    def _send(self, booking: Booking, subject: str, body: str) -> None:
        send_mail(subject, body, None, [booking.user.email], fail_silently=False)

    def booking_confirmed(self, booking: Booking) -> None:
        self._send(
            booking,
            f"Booking confirmed: {booking.space.name}",
            f"Hi {booking.user.username}, your booking at {booking.space.location.name} "
            f"for {_when(booking)} is confirmed. Total: INR {booking.total_price}.",
        )

    def booking_awaiting_approval(self, booking: Booking) -> None:
        self._send(
            booking,
            f"Request received: {booking.space.name}",
            f"Your request for {booking.space.name} on {_when(booking)} is waiting for a manager's approval.",
        )

    def booking_rejected(self, booking: Booking) -> None:
        self._send(
            booking,
            f"Request declined: {booking.space.name}",
            f"Sorry, your request for {booking.space.name} on {_when(booking)} was declined. The slot is free again.",
        )

    def booking_cancelled(self, booking: Booking) -> None:
        self._send(
            booking,
            f"Booking cancelled: {booking.space.name}",
            f"Your booking at {booking.space.location.name} for {_when(booking)} was cancelled.",
        )
