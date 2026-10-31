from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import NotFoundError
from apps.spaces.selectors import get_active_space

from .models import Issue


def report_issue(*, user, space_id: int, title: str, description: str = "", priority: str = Issue.Priority.MEDIUM,
                 blocks_booking: bool = False) -> Issue:
    space = get_active_space(space_id)
    if space is None:
        raise NotFoundError("This space does not exist.")
    return Issue.objects.create(
        space=space,
        reported_by=user,
        title=title,
        description=description,
        priority=priority,
        blocks_booking=blocks_booking,
    )


@transaction.atomic
def change_status(*, issue_id: int, status: str) -> Issue:
    issue = Issue.objects.select_for_update().filter(pk=issue_id).first()
    if issue is None:
        raise NotFoundError("Issue not found.")
    issue.status = status
    issue.resolved_at = timezone.now() if status == Issue.Status.RESOLVED else None
    issue.save(update_fields=["status", "resolved_at", "updated_at"])
    return issue
