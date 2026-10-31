from django.contrib import admin

from .models import Issue


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ["title", "space", "priority", "status", "blocks_booking", "created_at"]
    list_filter = ["status", "priority", "blocks_booking", "space__location"]
    search_fields = ["title", "space__name"]
    list_select_related = ["space"]
