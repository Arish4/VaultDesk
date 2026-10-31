from dataclasses import asdict

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.maintenance.selectors import unresolved_issues
from apps.spaces.selectors import get_active_space
from apps.spaces.serializers import LocationSerializer

from . import selectors
from .calendar import compute_day_stats
from .dependencies import get_booking_service
from .exceptions import SpaceNotFound
from .models import Booking
from .serializers import (
    ApprovalSerializer,
    BookedSlotSerializer,
    BookingCreateSerializer,
    BookingSerializer,
    CalendarQuerySerializer,
    CalendarSpaceSerializer,
    DateQuerySerializer,
)


class BookingListCreateView(generics.ListAPIView):
    """GET: my bookings (paginated). POST: book a space."""

    serializer_class = BookingSerializer

    def get_queryset(self):
        return selectors.bookings_for_user(self.request.user)

    def post(self, request: Request) -> Response:
        payload = BookingCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        booking = get_booking_service().create(user=request.user, **payload.validated_data)
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class BookingCancelView(APIView):
    def post(self, request: Request, pk: int) -> Response:
        booking = get_booking_service().cancel(user=request.user, booking_id=pk)
        return Response(BookingSerializer(booking).data)


class ApprovalListView(generics.ListAPIView):
    """Managers only: requests waiting for a decision."""

    serializer_class = ApprovalSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return selectors.pending_approvals()


class BookingApproveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request: Request, pk: int) -> Response:
        booking = get_booking_service().approve(reviewer=request.user, booking_id=pk)
        return Response(BookingSerializer(booking).data)


class BookingRejectView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request: Request, pk: int) -> Response:
        booking = get_booking_service().reject(reviewer=request.user, booking_id=pk)
        return Response(BookingSerializer(booking).data)


class SpaceAvailabilityView(APIView):
    """GET /api/spaces/{id}/availability/?date=YYYY-MM-DD → the times already taken."""

    permission_classes = [AllowAny]

    def get(self, request: Request, pk: int) -> Response:
        query = DateQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        space = get_active_space(pk)
        if space is None:
            raise SpaceNotFound("This space does not exist or is not bookable.")

        booked = selectors.active_bookings_on(space.id, query.validated_data["date"])
        return Response({
            "space_id": space.id,
            "date": query.validated_data["date"],
            "opens_at": space.location.opens_at,
            "closes_at": space.location.closes_at,
            "booked": BookedSlotSerializer(booked, many=True).data,
        })


class CalendarView(APIView):
    """GET /api/calendar/?date=&location= → every room with its bookings for the day + header stats."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        query = CalendarQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        now = timezone.now()
        day = query.validated_data.get("date") or timezone.localdate(now)

        spaces = selectors.spaces_with_day_bookings(day, query.validated_data.get("location"))
        context = {"user": request.user}

        # Group rooms under their building, keeping the order from the query.
        groups: dict[int, dict] = {}
        for space in spaces:
            group = groups.setdefault(space.location_id, {**LocationSerializer(space.location).data, "spaces": []})
            group["spaces"].append(CalendarSpaceSerializer(space, context=context).data)

        return Response({
            "date": day,
            "now": now,
            "stats": asdict(compute_day_stats(spaces, now=now, day=day)),
            "locations": list(groups.values()),
        })


class SummaryView(APIView):
    """Badge counts for the sidebar."""

    def get(self, request: Request) -> Response:
        user = request.user
        return Response({
            "open_issues": unresolved_issues().count(),
            "pending_approvals": selectors.pending_approvals().count() if user.is_staff else None,
            "my_upcoming": selectors.bookings_for_user(user)
            .filter(status__in=Booking.ACTIVE_STATUSES, start_at__gt=timezone.now())
            .count(),
        })
