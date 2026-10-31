"""Small helpers that build test data with sensible defaults."""
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.spaces.models import Location, Space


def local_time(days_ahead: int, hour: int, minute: int = 0) -> datetime:
    """An aware datetime in the project time zone, e.g. tomorrow at 10:00."""
    day = timezone.localdate() + timedelta(days=days_ahead)
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


def make_user(username: str = "asha", **extra):
    return get_user_model().objects.create_user(username, f"{username}@example.com", "S3cure-pass!", **extra)


def make_space(**overrides) -> Space:
    location = overrides.pop("location", None) or Location.objects.create(
        name=f"Centre {Location.objects.count() + 1}", city="Bengaluru", address="1 MG Road"
    )
    defaults = {"name": "Desk 1", "kind": Space.Kind.DESK, "capacity": 1, "hourly_price": Decimal("200.00")}
    return Space.objects.create(location=location, **{**defaults, **overrides})


class FakeNotifier:
    """Records calls instead of sending email, so tests can assert on them."""

    def __init__(self) -> None:
        self.confirmed: list[int] = []
        self.awaiting: list[int] = []
        self.rejected: list[int] = []
        self.cancelled: list[int] = []

    def booking_confirmed(self, booking) -> None:
        self.confirmed.append(booking.id)

    def booking_awaiting_approval(self, booking) -> None:
        self.awaiting.append(booking.id)

    def booking_rejected(self, booking) -> None:
        self.rejected.append(booking.id)

    def booking_cancelled(self, booking) -> None:
        self.cancelled.append(booking.id)
