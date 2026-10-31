"""Read-only booking queries."""
from datetime import date, datetime, time, timedelta

from django.contrib.auth.models import AbstractBaseUser
from django.db.models import Prefetch, QuerySet
from django.utils import timezone

from apps.maintenance.selectors import out_of_service_subquery
from apps.spaces.models import Space
from apps.spaces.selectors import active_spaces

from .models import Booking


def day_window(day: date) -> tuple[datetime, datetime]:
    """Local midnight to the next local midnight, as aware datetimes."""
    start = timezone.make_aware(datetime.combine(day, time.min))
    return start, start + timedelta(days=1)


def overlapping_bookings(space_id: int, start_at: datetime, end_at: datetime) -> QuerySet[Booking]:
    """Two windows overlap when each one starts before the other ends.

    SQL: WHERE space_id = %s AND status IN ('pending','confirmed') AND start_at < %s AND end_at > %s
    Back-to-back bookings (10-11 and 11-12) do NOT overlap.
    """
    return Booking.objects.filter(
        space_id=space_id,
        status__in=Booking.ACTIVE_STATUSES,
        start_at__lt=end_at,
        end_at__gt=start_at,
    )


def bookings_for_user(user: AbstractBaseUser) -> QuerySet[Booking]:
    return Booking.objects.filter(user=user).select_related("space__location")


def active_bookings_on(space_id: int, day: date) -> QuerySet[Booking]:
    """Bookings that hold time on a local calendar day, for the availability view."""
    start, end = day_window(day)
    return overlapping_bookings(space_id, start, end).order_by("start_at")


def pending_approvals() -> QuerySet[Booking]:
    return (
        Booking.objects.filter(status=Booking.Status.PENDING, end_at__gt=timezone.now())
        .select_related("user", "space__location")
        .order_by("start_at")
    )


def spaces_with_day_bookings(day: date, location_id: int | None = None) -> list[Space]:
    """Every active space with its bookings for one day, in 2 SQL queries total.

    prefetch_related runs one extra query for all bookings and attaches them to the spaces
    (instead of one query per space), and the Exists() annotation flags broken rooms.
    """
    start, end = day_window(day)
    day_bookings = (
        Booking.objects.filter(status__in=Booking.ACTIVE_STATUSES, start_at__lt=end, end_at__gt=start)
        .select_related("user")
        .order_by("start_at")
    )
    spaces = (
        active_spaces(location_id=location_id)
        .annotate(out_of_service=out_of_service_subquery())
        .prefetch_related(Prefetch("bookings", queryset=day_bookings, to_attr="day_bookings"))
        .order_by("location__name", "name")
    )
    return list(spaces)
