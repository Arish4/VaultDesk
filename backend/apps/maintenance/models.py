from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.spaces.models import Space


class Issue(TimeStampedModel):
    """A maintenance problem reported for a space (broken projector, AC not working, ...)."""

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"

    UNRESOLVED_STATUSES = (Status.OPEN, Status.IN_PROGRESS)

    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name="issues")
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="issues")
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    # When true, nobody can book the space until the issue is resolved.
    blocks_booking = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "space"])]

    def __str__(self) -> str:
        return f"{self.title} ({self.get_status_display()})"
