from datetime import time

from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel

class Location(TimeStampedModel):
    """A physical Urban-Vault-style centre, e.g. 'Koramangala'."""

    name = models.CharField(max_length=120, unique=True)
    city = models.CharField(max_length=80, db_index=True)
    address = models.CharField(max_length=255)
    opens_at = models.TimeField(default=time(8, 0))
    closes_at = models.TimeField(default=time(20, 0))

    class Meta:
        ordering = ["city", "name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(closes_at__gt=models.F("opens_at")),
                name="location_closes_after_opens",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name}, {self.city}"


class Space(TimeStampedModel):
    """Something you can book inside a location: a desk, a room, a cabin or a hall."""

    class Kind(models.TextChoices):
        DESK = "desk", "Hot desk"
        MEETING_ROOM = "meeting_room", "Meeting room"
        CLASSROOM = "classroom", "Classroom"
        AUDITORIUM = "auditorium", "Auditorium"
        QUIET_ROOM = "quiet_room", "Quiet room"
        CABIN = "cabin", "Private cabin"

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="spaces")
    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    capacity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    hourly_price = models.DecimalField(max_digits=8, decimal_places=2)  # money is never a float
    amenities = models.JSONField(default=list, blank=True)  # e.g. ["TV", "Projector"]
    # Big or sensitive rooms: bookings start as "pending" until a manager approves them.
    requires_approval = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["location__name", "name"]
        constraints = [
            models.UniqueConstraint(fields=["location", "name"], name="unique_space_name_per_location"),
            models.CheckConstraint(condition=models.Q(hourly_price__gte=0), name="space_price_not_negative"),
        ]
        indexes = [models.Index(fields=["kind", "is_active"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_kind_display()}) @ {self.location.name}"
