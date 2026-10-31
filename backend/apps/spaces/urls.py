from django.urls import path

from .views import LocationListView, SpaceDetailView, SpaceListView

urlpatterns = [
    path("locations/", LocationListView.as_view(), name="location-list"),
    path("spaces/", SpaceListView.as_view(), name="space-list"),
    path("spaces/<int:pk>/", SpaceDetailView.as_view(), name="space-detail"),
]
