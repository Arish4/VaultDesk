from rest_framework import serializers

from .models import Location, Space

MAX_AMENITIES = 10


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "name", "city", "address", "opens_at", "closes_at"]


class SpaceSerializer(serializers.ModelSerializer):
    """Output shape of a room."""

    location = LocationSerializer(read_only=True)
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Space
        fields = [
            "id", "name", "kind", "kind_label", "capacity", "hourly_price",
            "amenities", "requires_approval", "is_active", "location",
        ]


class SpaceWriteSerializer(serializers.ModelSerializer):
    """Input for managers creating or editing a room. `location` is just the building's id."""

    location = serializers.PrimaryKeyRelatedField(queryset=Location.objects.all())
    amenities = serializers.ListField(
        # allow_blank: a stray empty item (e.g. trailing comma) is dropped in validate_amenities, not an error.
        child=serializers.CharField(max_length=40, allow_blank=True), required=False, max_length=MAX_AMENITIES
    )
    hourly_price = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=0)

    class Meta:
        model = Space
        fields = ["location", "name", "kind", "capacity", "hourly_price", "amenities", "requires_approval", "is_active"]
        extra_kwargs = {"capacity": {"min_value": 1, "max_value": 1000}}
        # Replace DRF's automatic unique-together check with the friendlier, case-insensitive one in validate().
        validators: list = []

    def validate_name(self, value: str) -> str:
        return value.strip()

    def validate_amenities(self, value: list[str]) -> list[str]:
        # Trim, drop empties and duplicates (case-insensitive), keep the order the manager typed.
        seen, cleaned = set(), []
        for item in (v.strip() for v in value):
            if item and item.lower() not in seen:
                seen.add(item.lower())
                cleaned.append(item)
        return cleaned

    def validate(self, attrs: dict) -> dict:
        location = attrs.get("location", getattr(self.instance, "location", None))
        name = attrs.get("name", getattr(self.instance, "name", ""))
        clash = Space.objects.filter(location=location, name__iexact=name)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError({"name": f"{location.name} already has a room called “{name}”."})
        return attrs


class SpaceFilterSerializer(serializers.Serializer):
    """Validates the ?location=&kind=&min_capacity=&include_inactive= query string."""

    location = serializers.IntegerField(required=False, min_value=1)
    kind = serializers.ChoiceField(choices=Space.Kind.choices, required=False)
    min_capacity = serializers.IntegerField(required=False, min_value=1)
    include_inactive = serializers.BooleanField(required=False, default=False)
