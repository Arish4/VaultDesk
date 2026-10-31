from datetime import time

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.bookings.calendar import compute_day_stats
from apps.bookings.models import Booking
from apps.bookings.selectors import spaces_with_day_bookings
from apps.maintenance.models import Issue
from apps.spaces.models import Location

from .factories import local_time, make_space, make_user


class CalendarTestData:
    def make_data(self):
        self.user = make_user()
        self.location = Location.objects.create(
            name="Training Center", city="Bengaluru", address="1 Road", opens_at=time(8), closes_at=time(20)
        )
        self.room_a = make_space(location=self.location, name="Classroom A", capacity=40)
        self.room_b = make_space(location=self.location, name="Classroom B", capacity=20)
        self.broken = make_space(location=self.location, name="Old Room", capacity=8)
        Issue.objects.create(space=self.broken, title="Leak", blocks_booking=True)

        # Tomorrow: A booked 10-12, B booked 14-15 (pending), plus a cancelled one that must be ignored.
        self.day = local_time(1, 0).date()
        self.book(self.room_a, 10, 12, Booking.Status.CONFIRMED)
        self.book(self.room_b, 14, 15, Booking.Status.PENDING)
        self.book(self.room_b, 9, 10, Booking.Status.CANCELLED)

    def book(self, space, start, end, status):
        return Booking.objects.create(
            user=self.user, space=space, start_at=local_time(1, start), end_at=local_time(1, end),
            status=status, total_price="100.00", title=f"{space.name} {start}",
        )


class DayStatsTests(CalendarTestData, TestCase):
    def setUp(self):
        self.make_data()

    def stats_at(self, hour):
        spaces = spaces_with_day_bookings(self.day)
        return compute_day_stats(spaces, now=local_time(1, hour), day=self.day)

    def test_counts_bookings_pending_and_broken_rooms(self):
        stats = self.stats_at(9)
        self.assertEqual(stats.rooms_total, 3)
        self.assertEqual(stats.bookings_total, 2)  # cancelled booking excluded
        self.assertEqual(stats.pending, 1)
        self.assertEqual(stats.out_of_service, 1)

    def test_room_in_use_now_and_until_when(self):
        stats = self.stats_at(11)
        self.assertEqual(stats.in_use_now, 1)
        self.assertEqual(stats.busy_room.name, "Classroom A")
        self.assertEqual(stats.busy_room.until, local_time(1, 12))

    def test_next_free_is_the_room_free_longest(self):
        # At 11:00 Classroom B is free until its 14:00 booking; A is busy; Old Room is broken.
        stats = self.stats_at(11)
        self.assertEqual(stats.next_free.name, "Classroom B")
        self.assertEqual(stats.next_free.until, local_time(1, 14))

    def test_other_days_have_no_live_status(self):
        spaces = spaces_with_day_bookings(self.day)
        stats = compute_day_stats(spaces, now=local_time(0, 11), day=self.day)
        self.assertEqual(stats.in_use_now, 0)
        self.assertIsNone(stats.next_free)

    def test_calendar_loads_in_constant_queries(self):
        # spaces (+ out-of-service EXISTS) and one prefetch for all bookings with their users.
        with self.assertNumQueries(2):
            spaces = spaces_with_day_bookings(self.day)
            [b.user.username for s in spaces for b in s.day_bookings]


class CalendarApiTests(CalendarTestData, APITestCase):
    def setUp(self):
        self.make_data()

    def test_calendar_groups_rooms_by_building(self):
        response = self.client.get(reverse("calendar"), {"date": self.day.isoformat()})
        self.assertEqual(response.status_code, 200)
        building = response.data["locations"][0]
        self.assertEqual(building["name"], "Training Center")
        rooms = {room["name"]: room for room in building["spaces"]}
        self.assertTrue(rooms["Old Room"]["out_of_service"])
        self.assertEqual(len(rooms["Classroom A"]["bookings"]), 1)
        self.assertFalse(rooms["Classroom A"]["bookings"][0]["is_mine"])  # anonymous visitor

    def test_is_mine_for_logged_in_owner(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("calendar"), {"date": self.day.isoformat()})
        booking = response.data["locations"][0]["spaces"][0]["bookings"][0]
        self.assertTrue(booking["is_mine"])

    def test_filter_by_building(self):
        other = Location.objects.create(name="Main House", city="Bengaluru", address="2 Road")
        make_space(location=other, name="Desk 1")
        response = self.client.get(reverse("calendar"), {"date": self.day.isoformat(), "location": other.id})
        self.assertEqual([b["name"] for b in response.data["locations"]], ["Main House"])

    def test_summary_counts(self):
        manager = make_user("manager", is_staff=True)
        self.client.force_authenticate(manager)
        summary = self.client.get(reverse("summary")).data
        self.assertEqual(summary["open_issues"], 1)
        self.assertEqual(summary["pending_approvals"], 1)

        self.client.force_authenticate(self.user)
        self.assertIsNone(self.client.get(reverse("summary")).data["pending_approvals"])
