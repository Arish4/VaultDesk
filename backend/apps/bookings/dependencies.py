"""Composition root: the one place that picks concrete implementations."""
from .notifications import EmailBookingNotifier
from .pricing import HourlyPricing
from .services import BookingService


def get_booking_service() -> BookingService:
    return BookingService(pricing=HourlyPricing(), notifier=EmailBookingNotifier())
