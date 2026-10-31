from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "space", "start_at", "end_at", "status", "total_price"]
    list_filter = ["status", "space__kind", "space__location"]
    search_fields = ["user__username", "space__name"]
    date_hierarchy = "start_at"
    list_select_related = ["user", "space"]
