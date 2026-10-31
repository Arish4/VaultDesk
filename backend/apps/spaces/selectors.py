"""Read-only queries for spaces. Views call these instead of building querysets themselves."""
from django.db.models import QuerySet

from .models import Location, Space


def all_locations() -> QuerySet[Location]:
    return Location.objects.all()


def active_spaces(
    *,
    location_id: int | None = None,
    kind: str | None = None,
    min_capacity: int | None = None,
    include_inactive: bool = False,
) -> QuerySet[Space]:
    # select_related joins Location in the same SQL query, avoiding one extra query per space (N+1).
    spaces = Space.objects.select_related("location")
    if not include_inactive:  # hidden rooms are only listed for managers who ask for them
        spaces = spaces.filter(is_active=True)
    if location_id is not None:
        spaces = spaces.filter(location_id=location_id)
    if kind:
        spaces = spaces.filter(kind=kind)
    if min_capacity is not None:
        spaces = spaces.filter(capacity__gte=min_capacity)
    return spaces


def get_active_space(space_id: int) -> Space | None:
    return active_spaces().filter(pk=space_id).first()
