from django.contrib import admin

from .models import Location, Space


class SpaceInline(admin.TabularInline):
    model = Space
    extra = 0


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "opens_at", "closes_at"]
    search_fields = ["name", "city"]
    inlines = [SpaceInline]


@admin.register(Space)
class SpaceAdmin(admin.ModelAdmin):
    list_display = ["name", "location", "kind", "capacity", "hourly_price", "is_active"]
    list_filter = ["kind", "is_active", "location__city"]
    search_fields = ["name", "location__name"]
    list_select_related = ["location"]
