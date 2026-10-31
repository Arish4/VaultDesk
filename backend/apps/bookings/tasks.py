"""Celery background jobs. Each task loads fresh data by id and is safe to run twice."""
import logging
from smtplib import SMTPException

from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone

from .models import Booking

logger = logging.getLogger(__name__)

RETRY_OPTIONS = {
    "autoretry_for": (SMTPException, ConnectionError),
    "retry_backoff": True,  # wait 1s, 2s, 4s ... between retries
    "max_retries": 3,
}


def _load(booking_id: int) -> Booking | None:
    return Booking.objects.select_related("user", "space__location").filter(pk=booking_id).first()


def _when(booking: Booking) -> str:
    start = timezone.localtime(booking.start_at)
    end = timezone.localtime(booking.end_at)
    return f"{start:%a %d %b, %H:%M}-{end:%H:%M}"


def _email(booking: Booking, subject: str, body: str) -> None:
    send_mail(subject, body, None, [booking.user.email], fail_silently=False)


@shared_task(**RETRY_OPTIONS)
def send_booking_confirmation(booking_id: int) -> None:
    booking = _load(booking_id)
    if booking is None:
        logger.warning("Booking %s vanished before confirmation email", booking_id)
        return
    _email(
        booking,
        f"Booking confirmed: {booking.space.name}",
        f"Hi {booking.user.username}, your booking at {booking.space.location.name} "
        f"for {_when(booking)} is confirmed. Total: INR {booking.total_price}.",
    )


@shared_task(**RETRY_OPTIONS)
def send_booking_reminder(booking_id: int) -> None:
    booking = _load(booking_id)
    # Idempotent: if it was cancelled after the reminder was scheduled, do nothing.
    if booking is None or booking.status != Booking.Status.CONFIRMED:
        return
    _email(
        booking,
        f"Starting soon: {booking.space.name}",
        f"Reminder: your booking at {booking.space.location.name} starts {_when(booking)}.",
    )


@shared_task(**RETRY_OPTIONS)
def send_booking_request_received(booking_id: int) -> None:
    booking = _load(booking_id)
    if booking is None:
        return
    _email(
        booking,
        f"Request received: {booking.space.name}",
        f"Your request for {booking.space.name} on {_when(booking)} is waiting for a manager's approval.",
    )


@shared_task(**RETRY_OPTIONS)
def send_booking_rejection(booking_id: int) -> None:
    booking = _load(booking_id)
    if booking is None:
        return
    _email(
        booking,
        f"Request declined: {booking.space.name}",
        f"Sorry, your request for {booking.space.name} on {_when(booking)} was declined. The slot is free again.",
    )


@shared_task(**RETRY_OPTIONS)
def send_booking_cancellation(booking_id: int) -> None:
    booking = _load(booking_id)
    if booking is None:
        return
    _email(
        booking,
        f"Booking cancelled: {booking.space.name}",
        f"Your booking at {booking.space.location.name} for {_when(booking)} was cancelled.",
    )
