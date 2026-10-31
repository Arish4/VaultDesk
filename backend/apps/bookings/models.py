from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.spaces.models import Space


class Booking(TimeStampedModel):
    """One user reserving one space for a time window."""

    class Status(models.TextChoices):
        PENDING = "pending", "Waiting for approval"
        CONFIRMED = "confirmed", "Confirmed"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    # Pending and confirmed bookings both hold the slot; rejected/cancelled ones free it.
    ACTIVE_STATUSES = (Status.PENDING, Status.CONFIRMED)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings")
    # PROTECT: a space with booking history cannot be deleted by accident (deactivate it instead).
    space = models.ForeignKey(Space, on_delete=models.PROTECT, related_name="bookings")
    title = models.CharField(max_length=120, blank=True)
    attendees = models.PositiveSmallIntegerField(default=1)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    # Audit trail for approvals: who approved/rejected it.
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_bookings"
    )

    class Meta:
        ordering = ["-start_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(end_at__gt=models.F("start_at")), name="booking_ends_after_start"),
            models.CheckConstraint(condition=models.Q(attendees__gte=1), name="booking_has_attendees"),
        ]
        indexes = [
            # Speeds up the overlap check and "bookings of this space on this day".
            models.Index(fields=["space", "start_at"]),
            # Speeds up "my bookings".
            models.Index(fields=["user", "-start_at"]),
            # Speeds up the approvals queue.
            models.Index(fields=["status", "start_at"]),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} {self.space.name} {self.start_at:%Y-%m-%d %H:%M} ({self.status})"

    @property
    def display_title(self) -> str:
        return self.title or f"{self.space.name} booking"
