from apps.core.exceptions import ConflictError, DomainError, NotFoundError


class InvalidBookingWindow(DomainError):
    code = "invalid_window"


class OutsideOpeningHours(DomainError):
    code = "outside_opening_hours"


class TooManyAttendees(DomainError):
    code = "too_many_attendees"


class SlotUnavailable(ConflictError):
    code = "slot_unavailable"


class SpaceOutOfService(ConflictError):
    code = "out_of_service"


class BookingNotCancellable(ConflictError):
    code = "not_cancellable"


class BookingNotReviewable(ConflictError):
    code = "not_reviewable"


class SpaceNotFound(NotFoundError):
    code = "space_not_found"


class BookingNotFound(NotFoundError):
    code = "booking_not_found"
