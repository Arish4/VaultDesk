from django.urls import path

from .views import (
    ApprovalListView,
    BookingApproveView,
    BookingCancelView,
    BookingListCreateView,
    BookingRejectView,
    CalendarView,
    SpaceAvailabilityView,
    SummaryView,
)

urlpatterns = [
    path("bookings/", BookingListCreateView.as_view(), name="booking-list"),
    path("bookings/<int:pk>/cancel/", BookingCancelView.as_view(), name="booking-cancel"),
    path("bookings/<int:pk>/approve/", BookingApproveView.as_view(), name="booking-approve"),
    path("bookings/<int:pk>/reject/", BookingRejectView.as_view(), name="booking-reject"),
    path("approvals/", ApprovalListView.as_view(), name="approval-list"),
    path("calendar/", CalendarView.as_view(), name="calendar"),
    path("summary/", SummaryView.as_view(), name="summary"),
    path("spaces/<int:pk>/availability/", SpaceAvailabilityView.as_view(), name="space-availability"),
]
