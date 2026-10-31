"""Business errors raised by services, turned into clean JSON responses in one place."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


class DomainError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "invalid"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ConflictError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"


def api_exception_handler(exc: Exception, context: dict) -> Response | None:
    if isinstance(exc, DomainError):
        return Response({"detail": exc.message, "code": exc.code}, status=exc.status_code)
    return exception_handler(exc, context)
