from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors, services
from .serializers import IssueFilterSerializer, IssueSerializer, IssueStatusSerializer


class IssueListCreateView(generics.ListAPIView):
    """GET: issues (filter by ?status=&location=). POST: any member can report a problem."""

    serializer_class = IssueSerializer

    def get_queryset(self):
        filters = IssueFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        return selectors.issues(
            status=filters.validated_data.get("status"),
            location_id=filters.validated_data.get("location"),
        )

    def post(self, request: Request) -> Response:
        payload = IssueSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        issue = services.report_issue(
            user=request.user,
            space_id=data["space"].id,
            title=data["title"],
            description=data.get("description", ""),
            priority=data.get("priority", "medium"),
            blocks_booking=data.get("blocks_booking", False),
        )
        return Response(IssueSerializer(issue).data, status=status.HTTP_201_CREATED)


class IssueStatusView(APIView):
    """Only facility managers (staff) move issues through open → in progress → resolved."""

    permission_classes = [IsAdminUser]

    def patch(self, request: Request, pk: int) -> Response:
        payload = IssueStatusSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        issue = services.change_status(issue_id=pk, status=payload.validated_data["status"])
        return Response(IssueSerializer(issue).data)
