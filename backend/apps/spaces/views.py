from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.permissions import IsStaffOrReadOnly

from . import selectors
from .serializers import LocationSerializer, SpaceFilterSerializer, SpaceSerializer, SpaceWriteSerializer


class LocationListView(generics.ListAPIView):
    serializer_class = LocationSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return selectors.all_locations()


def is_staff(request: Request) -> bool:
    return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class SpaceListView(generics.ListCreateAPIView):
    """GET: rooms anyone can book. POST (managers only): add a room; everyone sees it straight away."""

    serializer_class = SpaceSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        filters = SpaceFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data
        return selectors.active_spaces(
            location_id=params.get("location"),
            kind=params.get("kind"),
            min_capacity=params.get("min_capacity"),
            include_inactive=params["include_inactive"] and is_staff(self.request),
        )

    def create(self, request: Request, *args, **kwargs) -> Response:
        payload = SpaceWriteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        space = payload.save()
        return Response(SpaceSerializer(space).data, status=status.HTTP_201_CREATED)


class SpaceDetailView(generics.RetrieveUpdateAPIView):
    """GET: one room. PATCH (managers only): edit it, e.g. turn approval on or hide the room."""

    serializer_class = SpaceSerializer
    permission_classes = [IsStaffOrReadOnly]
    http_method_names = ["get", "patch", "head", "options"]  # no PUT: edits are partial

    def get_queryset(self):
        # Managers can open (and re-activate) hidden rooms; everyone else only sees active ones.
        return selectors.active_spaces(include_inactive=is_staff(self.request))

    def partial_update(self, request: Request, *args, **kwargs) -> Response:
        payload = SpaceWriteSerializer(self.get_object(), data=request.data, partial=True)
        payload.is_valid(raise_exception=True)
        space = payload.save()
        return Response(SpaceSerializer(space).data)
