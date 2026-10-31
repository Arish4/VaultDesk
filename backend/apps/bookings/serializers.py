from rest_framework import serializers

from apps.spaces.serializers import SpaceSerializer

from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    """Output shape of a booking."""

    space = SpaceSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id", "space", "title", "attendees", "start_at", "end_at",
            "status", "status_label", "total_price", "created_at",
        ]
        read_only_fields = fields


class ApprovalSerializer(BookingSerializer):
    requested_by = serializers.CharField(source="user.username", read_only=True)

    class Meta(BookingSerializer.Meta):
        fields = [*BookingSerializer.Meta.fields, "requested_by"]
        read_only_fields = fields


class BookingCreateSerializer(serializers.Serializer):
    """Input shape for creating a booking. Business rules live in BookingService."""

    space_id = serializers.IntegerField(min_value=1)
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    title = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    attendees = serializers.IntegerField(min_value=1, max_value=500, required=False, default=1)

    def validate(self, attrs: dict) -> dict:
        if attrs["end_at"] <= attrs["start_at"]:
            raise serializers.ValidationError({"end_at": "End time must be after start time."})
        return attrs


class BookedSlotSerializer(serializers.ModelSerializer):
    """Only the times: other people's bookings must not leak who booked."""

    class Meta:
        model = Booking
        fields = ["start_at", "end_at"]


class CalendarBookingSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="display_title")
    booked_by = serializers.CharField(source="user.username")
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ["id", "title", "start_at", "end_at", "status", "attendees", "booked_by", "is_mine"]

    def get_is_mine(self, booking: Booking) -> bool:
        user = self.context.get("user")
        return bool(user and user.is_authenticated and booking.user_id == user.id)


class CalendarSpaceSerializer(SpaceSerializer):
    out_of_service = serializers.BooleanField()
    bookings = CalendarBookingSerializer(source="day_bookings", many=True)

    class Meta(SpaceSerializer.Meta):
        fields = [f for f in SpaceSerializer.Meta.fields if f != "location"] + ["out_of_service", "bookings"]


class DateQuerySerializer(serializers.Serializer):
    date = serializers.DateField()


class CalendarQuerySerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    location = serializers.IntegerField(required=False, min_value=1)
