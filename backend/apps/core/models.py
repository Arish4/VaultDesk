from django.db import models


class TimeStampedModel(models.Model):
    """Adds created/updated audit fields to any model that inherits it."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True  # no table of its own; fields are copied into child tables
