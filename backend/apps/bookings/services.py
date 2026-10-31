"""Write-side business logic for bookings. Views stay thin and call these methods."""
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from apps.maintenance.selectors import is_out_of_service
from apps.spaces.models import Space

from .exceptions import (
    BookingNotCancellable,
    BookingNotFound,
    BookingNotReviewable,
    InvalidBookingWindow,
    OutsideOpeningHours,
    SlotUnavailable,
    SpaceNotFound,
    SpaceOutOfService,
    TooManyAttendees,
)
from .models import Booking
from .notifications import BookingNotifier
from .pricing import PricingPolicy
from .selectors import overlapping_bookings

MIN_DURATION = timedelta(minutes=30)
MAX_DURATION = timedelta(hours=12)


def validate_window(start_at: datetime, end_at: datetime) -> None:
    if end_at <= start_at:
        raise InvalidBookingWindow("The end time must be after the start time.")
    if start_at < timezone.now():
        raise InvalidBookingWindow("You cannot book a time in the past.")
    if not MIN_DURATION <= end_at - start_at <= MAX_DURATION:
        raise InvalidBookingWindow("A booking must last between 30 minutes and 12 hours.")


def ensure_within_opening_hours(space: Space, start_at: datetime, end_at: datetime) -> None:
    start = timezone.localtime(start_at)
    end = timezone.localtime(end_at)
    location = space.location
    if start.date() != end.date() or start.time() < location.opens_at or end.time() > location.closes_at:
        raise OutsideOpeningHours(
            f"{location.name} is open {location.opens_at:%H:%M}–{location.closes_at:%H:%M}."
        )


class BookingService:
    """Single responsibility: the rules for creating, reviewing and cancelling bookings.

    Pricing and notifications are injected (dependency inversion), so they can be
    swapped or faked without touching this class.
    """

    def __init__(self, pricing: PricingPolicy, notifier: BookingNotifier) -> None:
        self._pricing = pricing
        self._notifier = notifier

    def create(self, *, user, space_id: int, start_at: datetime, end_at: datetime,
               title: str = "", attendees: int = 1) -> Booking:
        validate_window(start_at, end_at)

        with transaction.atomic():
            # Lock the space row: two people booking the same slot at the same moment
            # are processed one after the other, so only one of them wins.
            space = (
                Space.objects.select_for_update()
                .select_related("location")
                .filter(pk=space_id, is_active=True)
                .first()
            )
            if space is None:
                raise SpaceNotFound("This space does not exist or is not bookable.")
            if attendees > space.capacity:
                raise TooManyAttendees(f"{space.name} fits {space.capacity} people.")
            if is_out_of_service(space.id):
                raise SpaceOutOfService(f"{space.name} is out of service for maintenance.")

            ensure_within_opening_hours(space, start_at, end_at)
            if overlapping_bookings(space.id, start_at, end_at).exists():
                raise SlotUnavailable("This space is already booked for part of that time.")

            booking = Booking.objects.create(
                user=user,
                space=space,
                title=title.strip(),
                attendees=attendees,
                start_at=start_at,
                end_at=end_at,
                status=Booking.Status.PENDING if space.requires_approval else Booking.Status.CONFIRMED,
                total_price=self._pricing.price_for(space, start_at, end_at),
            )

        # Only notify after the row is really saved, never for a rolled-back booking.
        # robust=True: if notifying fails (broker down, bad email), log it but keep the booking.
        if booking.status == Booking.Status.PENDING:
            transaction.on_commit(lambda: self._notifier.booking_awaiting_approval(booking), robust=True)
        else:
            transaction.on_commit(lambda: self._notifier.booking_confirmed(booking), robust=True)
        return booking

    def cancel(self, *, user, booking_id: int) -> Booking:
        with transaction.atomic():
            booking = (
                Booking.objects.select_for_update()
                .select_related("space")
                .filter(pk=booking_id, user=user)  # users can only touch their own bookings
                .first()
            )
            if booking is None:
                raise BookingNotFound("Booking not found.")
            if booking.status not in Booking.ACTIVE_STATUSES:
                raise BookingNotCancellable(f"This booking is already {booking.status}.")
            if booking.start_at <= timezone.now():
                raise BookingNotCancellable("A booking that has started cannot be cancelled.")

            booking.status = Booking.Status.CANCELLED
            booking.save(update_fields=["status", "updated_at"])

        transaction.on_commit(lambda: self._notifier.booking_cancelled(booking), robust=True)
        return booking

    def approve(self, *, reviewer, booking_id: int) -> Booking:
        booking = self._review(reviewer=reviewer, booking_id=booking_id, new_status=Booking.Status.CONFIRMED)
        transaction.on_commit(lambda: self._notifier.booking_confirmed(booking), robust=True)
        return booking

    def reject(self, *, reviewer, booking_id: int) -> Booking:
        booking = self._review(reviewer=reviewer, booking_id=booking_id, new_status=Booking.Status.REJECTED)
        transaction.on_commit(lambda: self._notifier.booking_rejected(booking), robust=True)
        return booking

    def _review(self, *, reviewer, booking_id: int, new_status: str) -> Booking:
        with transaction.atomic():
            booking = Booking.objects.select_for_update().select_related("space").filter(pk=booking_id).first()
            if booking is None:
                raise BookingNotFound("Booking not found.")
            if booking.status != Booking.Status.PENDING:
                raise BookingNotReviewable(f"Only pending requests can be reviewed (this one is {booking.status}).")

            booking.status = new_status
            booking.reviewed_by = reviewer
            booking.save(update_fields=["status", "reviewed_by", "updated_at"])
        return booking
