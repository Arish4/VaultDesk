from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.bookings.tests.factories import local_time, make_space, make_user
from apps.spaces.models import Space


class SpaceApiTests(APITestCase):
    def setUp(self):
        self.desk = make_space(name="Desk 1")
        self.room = make_space(location=self.desk.location, name="Room", kind=Space.Kind.MEETING_ROOM, capacity=6)
        make_space(location=self.desk.location, name="Old desk", is_active=False)

    def test_lists_active_spaces_without_login(self):
        response = self.client.get(reverse("space-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filters_by_kind_and_capacity(self):
        response = self.client.get(reverse("space-list"), {"kind": "meeting_room", "min_capacity": 4})
        self.assertEqual([s["name"] for s in response.data["results"]], ["Room"])

    def test_rejects_unknown_kind(self):
        response = self.client.get(reverse("space-list"), {"kind": "rooftop"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_space_list_uses_one_query_for_spaces(self):
        # select_related: 1 COUNT query for pagination + 1 query for spaces with their locations.
        with self.assertNumQueries(2):
            self.client.get(reverse("space-list"))


class ManageRoomsApiTests(APITestCase):
    """Managers add and edit rooms from the app; members and guests can only read."""

    def setUp(self):
        self.desk = make_space(name="Desk 1")
        self.location = self.desk.location
        self.member = make_user()
        self.manager = make_user("manager", is_staff=True)

    def new_room(self, **overrides):
        return {
            "location": self.location.id, "name": "Focus Pod", "kind": "meeting_room",
            "capacity": 4, "hourly_price": "450.00", "amenities": ["TV", " tv ", "Whiteboard", ""],
            **overrides,
        }

    def test_guests_and_members_cannot_add_rooms(self):
        self.assertEqual(self.client.post(reverse("space-list"), self.new_room(), format="json").status_code, 401)
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.post(reverse("space-list"), self.new_room(), format="json").status_code, 403)

    def test_manager_adds_a_room_everyone_can_see(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(reverse("space-list"), self.new_room(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["amenities"], ["TV", "Whiteboard"])  # trimmed, de-duplicated

        self.client.force_authenticate(None)  # a guest now sees it in the list and the calendar
        names = [s["name"] for s in self.client.get(reverse("space-list")).data["results"]]
        self.assertIn("Focus Pod", names)
        calendar = self.client.get(reverse("calendar"), {"date": local_time(1, 0).date().isoformat()}).data
        self.assertIn("Focus Pod", [s["name"] for loc in calendar["locations"] for s in loc["spaces"]])

    def test_duplicate_name_in_same_building_is_rejected(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(reverse("space-list"), self.new_room(name="desk 1"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_invalid_values_are_rejected(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(reverse("space-list"), self.new_room(capacity=0, hourly_price="-5"), format="json")
        self.assertEqual(set(response.data), {"capacity", "hourly_price"})

    def test_turning_on_approval_makes_new_bookings_pending(self):
        self.client.force_authenticate(self.manager)
        url = reverse("space-detail", args=[self.desk.id])
        self.assertTrue(self.client.patch(url, {"requires_approval": True}, format="json").data["requires_approval"])

        self.client.force_authenticate(self.member)
        booking = self.client.post(reverse("booking-list"), {
            "space_id": self.desk.id,
            "start_at": local_time(1, 10).isoformat(), "end_at": local_time(1, 11).isoformat(),
        }, format="json")
        self.assertEqual(booking.data["status"], "pending")

    def test_hidden_room_disappears_for_members_but_manager_can_restore_it(self):
        self.client.force_authenticate(self.manager)
        url = reverse("space-detail", args=[self.desk.id])
        self.client.patch(url, {"is_active": False}, format="json")

        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.patch(url, {"is_active": True}, format="json").status_code, 403)

        self.client.force_authenticate(self.manager)
        listed = self.client.get(reverse("space-list"), {"include_inactive": "true"}).data["results"]
        self.assertIn("Desk 1", [s["name"] for s in listed])
        self.assertTrue(self.client.patch(url, {"is_active": True}, format="json").data["is_active"])
