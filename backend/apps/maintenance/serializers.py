from rest_framework import serializers

from .models import Issue


class IssueSerializer(serializers.ModelSerializer):
    space_name = serializers.CharField(source="space.name", read_only=True)
    location_name = serializers.CharField(source="space.location.name", read_only=True)
    reported_by = serializers.CharField(source="reported_by.username", read_only=True, default=None)

    class Meta:
        model = Issue
        fields = [
            "id", "space", "space_name", "location_name", "title", "description", "priority",
            "status", "blocks_booking", "reported_by", "created_at", "resolved_at",
        ]
        read_only_fields = ["status", "reported_by", "created_at", "resolved_at"]


class IssueStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Issue.Status.choices)


class IssueFilterSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[*Issue.Status.choices, ("unresolved", "Unresolved")], required=False)
    location = serializers.IntegerField(required=False, min_value=1)
