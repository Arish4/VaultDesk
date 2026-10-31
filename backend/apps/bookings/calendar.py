"""Numbers for the calendar header: rooms in use now, bookings today, next free room.

compute_day_stats is a pure function over already-loaded data (no queries), so it is
easy to unit test with any 'now'.
"""
from dataclasses import dataclass
from datetime import date, datetime

from django.utils import timezone

from apps.spaces.models import Space

from .models import Booking


@dataclass(frozen=True)
class RoomStatus:
    space_id: int
    name: str
    until: datetime


@dataclass(frozen=True)
class DayStats:
    rooms_total: int
    in_use_now: int
    busy_room: RoomStatus | None  # a room in use right now, and until when
    bookings_total: int
    pending: int
    out_of_service: int
    next_free: RoomStatus | None  # the free room that stays free the longest


def _closing_time(space: Space, day: date) -> datetime:
    return timezone.make_aware(datetime.combine(day, space.location.closes_at))


def compute_day_stats(spaces: list[Space], *, now: datetime, day: date) -> DayStats:
    is_today = timezone.localdate(now) == day
    bookings: list[Booking] = [b for space in spaces for b in space.day_bookings]
    busy: list[RoomStatus] = []
    free: list[RoomStatus] = []

    for space in spaces:
        if space.out_of_service or not is_today:
            continue
        current = next((b for b in space.day_bookings if b.start_at <= now < b.end_at), None)
        if current:
            busy.append(RoomStatus(space.id, space.name, current.end_at))
            continue
        closes = _closing_time(space, day)
        if now < closes:
            next_start = min((b.start_at for b in space.day_bookings if b.start_at > now), default=closes)
            free.append(RoomStatus(space.id, space.name, next_start))

    return DayStats(
        rooms_total=len(spaces),
        in_use_now=len(busy),
        busy_room=min(busy, key=lambda room: room.until, default=None),
        bookings_total=len(bookings),
        pending=sum(1 for b in bookings if b.status == Booking.Status.PENDING),
        out_of_service=sum(1 for space in spaces if space.out_of_service),
        next_free=max(free, key=lambda room: room.until, default=None),
    )
