from django.urls import path

from .views import IssueListCreateView, IssueStatusView

urlpatterns = [
    path("issues/", IssueListCreateView.as_view(), name="issue-list"),
    path("issues/<int:pk>/status/", IssueStatusView.as_view(), name="issue-status"),
]
