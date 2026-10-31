"""How much a booking costs.

Strategy pattern (Open/Closed principle): the booking service only knows the PricingPolicy
interface. A new rule (peak hours, member discounts) is a new class; the service never changes.
"""
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Protocol

from apps.spaces.models import Space

SECONDS_PER_HOUR = Decimal(3600)
PAISE = Decimal("0.01")


class PricingPolicy(Protocol):
    def price_for(self, space: Space, start_at: datetime, end_at: datetime) -> Decimal: ...


class HourlyPricing:
    """Price = hourly rate × hours booked, rounded to the paisa."""

    def price_for(self, space: Space, start_at: datetime, end_at: datetime) -> Decimal:
        hours = Decimal((end_at - start_at).total_seconds()) / SECONDS_PER_HOUR
        return (space.hourly_price * hours).quantize(PAISE, rounding=ROUND_HALF_UP)
