from django.db.models import Exists, OuterRef, QuerySet

from .models import Issue


def unresolved_issues() -> QuerySet[Issue]:
    return Issue.objects.filter(status__in=Issue.UNRESOLVED_STATUSES)


def issues(*, status: str | None = None, location_id: int | None = None) -> QuerySet[Issue]:
    queryset = Issue.objects.select_related("space__location", "reported_by")
    if status == "unresolved":
        queryset = queryset.filter(status__in=Issue.UNRESOLVED_STATUSES)
    elif status:
        queryset = queryset.filter(status=status)
    if location_id is not None:
        queryset = queryset.filter(space__location_id=location_id)
    return queryset


def is_out_of_service(space_id: int) -> bool:
    return unresolved_issues().filter(space_id=space_id, blocks_booking=True).exists()


def out_of_service_subquery():
    """Use with .annotate(out_of_service=...) to flag spaces in the same SQL query (no N+1)."""
    return Exists(unresolved_issues().filter(space=OuterRef("pk"), blocks_booking=True))
