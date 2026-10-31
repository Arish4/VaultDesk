"""python manage.py seed_demo [--reset]

Creates two buildings, their rooms, demo users, a week of bookings and some maintenance issues.
--reset wipes demo locations, spaces, bookings and issues first (users are kept).
"""
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.bookings.models import Booking
from apps.bookings.pricing import HourlyPricing
from apps.maintenance.models import Issue
from apps.spaces.models import Location, Space

K = Space.Kind
PASSWORD = "VaultDesk@123"  # local demo accounts only

BUILDINGS = [
    {
        "name": "Training Center",
        "city": "Bengaluru",
        "address": "12 Residency Road",
        "opens_at": time(7, 0),
        "closes_at": time(21, 0),
        "spaces": [
            # name, kind, capacity, hourly price, amenities, requires approval
            ("Classroom A", K.CLASSROOM, 40, "800.00", ["Projector", "Whiteboard"], False),
            ("Classroom B", K.CLASSROOM, 24, "600.00", ["Projector"], False),
            ("Prayer room", K.QUIET_ROOM, 15, "0.00", [], False),
            ("Meeting room", K.MEETING_ROOM, 10, "500.00", ["TV"], False),
            ("Auditorium", K.AUDITORIUM, 150, "5000.00", ["Sound", "Stage"], True),
        ],
    },
    {
        "name": "Main House",
        "city": "Bengaluru",
        "address": "80 Feet Road, Koramangala",
        "opens_at": time(8, 0),
        "closes_at": time(20, 0),
        "spaces": [
            ("Desk A1", K.DESK, 1, "150.00", ["Monitor"], False),
            ("Desk A2", K.DESK, 1, "150.00", [], False),
            ("Huddle Room", K.MEETING_ROOM, 4, "600.00", ["TV"], False),
            ("Board Room", K.MEETING_ROOM, 12, "1800.00", ["TV", "Video call"], True),
            ("Cabin 3", K.CABIN, 6, "1200.00", ["Whiteboard"], False),
        ],
    },
]

# space, start hour, end hour, title, username, attendees
DAILY_PLAN = [
    ("Classroom A", 9, 12, "DTS outreach prep", "asha", 30),
    ("Classroom A", 14, 16, "Python workshop", "ravi", 22),
    ("Prayer room", 7, 9, "Morning intercession", "asha", 10),
    ("Meeting room", 10, 11, "Sprint planning", "demo", 6),
    ("Meeting room", 15, 16.5, "Client demo", "ravi", 8),
    ("Auditorium", 16, 18, "All-hands rehearsal", "ravi", 120),
    ("Desk A1", 9, 17, "Focus day", "ravi", 1),
    ("Huddle Room", 11, 12, "Design review", "demo", 4),
    ("Huddle Room", 13, 14, "1:1 Asha / Ravi", "asha", 2),
    ("Board Room", 10, 12, "Quarterly review", "asha", 10),
    ("Cabin 3", 12, 18, "Hiring interviews", "ravi", 3),
]

ISSUES = [
    ("Classroom B", "Projector not turning on", Issue.Priority.HIGH, Issue.Status.OPEN, True),
    ("Huddle Room", "AC is very noisy", Issue.Priority.LOW, Issue.Status.OPEN, False),
    ("Desk A2", "Chair is broken", Issue.Priority.MEDIUM, Issue.Status.IN_PROGRESS, False),
    ("Cabin 3", "Door lock sticks", Issue.Priority.MEDIUM, Issue.Status.RESOLVED, False),
]


class Command(BaseCommand):
    help = "Create demo buildings, rooms, users, a week of bookings and maintenance issues."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--reset", action="store_true", help="Delete existing demo data first.")

    @transaction.atomic
    def handle(self, *args, reset: bool = False, **options) -> None:
        if reset:
            Booking.objects.all().delete()
            Issue.objects.all().delete()
            Space.objects.all().delete()
            Location.objects.all().delete()

        users = self._users()
        spaces = self._spaces()
        bookings = self._bookings(users, spaces)
        self._issues(users, spaces)

        self.stdout.write(self.style.SUCCESS(
            f"{Location.objects.count()} buildings, {Space.objects.count()} rooms, {bookings} new bookings, "
            f"{Issue.objects.count()} issues. Logins: demo / manager (staff), password '{PASSWORD}'."
        ))

    def _users(self) -> dict:
        User = get_user_model()
        users = {}
        for username, is_staff in [("demo", False), ("manager", True), ("asha", False), ("ravi", False)]:
            user, created = User.objects.get_or_create(
                username=username, defaults={"email": f"{username}@vaultdesk.local", "is_staff": is_staff}
            )
            if created:
                user.set_password(PASSWORD)
                user.save()
            users[username] = user
        return users

    def _spaces(self) -> dict:
        spaces = {}
        for building in BUILDINGS:
            location, _ = Location.objects.update_or_create(
                name=building["name"],
                defaults={key: building[key] for key in ("city", "address", "opens_at", "closes_at")},
            )
            for name, kind, capacity, price, amenities, approval in building["spaces"]:
                spaces[name], _ = Space.objects.update_or_create(
                    location=location,
                    name=name,
                    defaults={
                        "kind": kind, "capacity": capacity, "hourly_price": Decimal(price),
                        "amenities": amenities, "requires_approval": approval,
                    },
                )
        return spaces

    def _bookings(self, users: dict, spaces: dict) -> int:
        pricing = HourlyPricing()
        created = 0
        today = timezone.localdate()
        for offset in range(7):
            day = today + timedelta(days=offset)
            for index, (space_name, start_h, end_h, title, username, attendees) in enumerate(DAILY_PLAN):
                if (index + offset) % 5 == 4:
                    continue  # vary the plan a little from day to day
                space = spaces[space_name]
                start = self._at(day, start_h)
                end = self._at(day, end_h)
                status = Booking.Status.CONFIRMED
                if space.requires_approval and offset % 2 == 0:
                    status = Booking.Status.PENDING
                _, was_created = Booking.objects.get_or_create(
                    space=space,
                    start_at=start,
                    defaults={
                        "user": users[username], "end_at": end, "title": title, "attendees": attendees,
                        "status": status, "total_price": pricing.price_for(space, start, end),
                        "reviewed_by": users["manager"] if status == Booking.Status.CONFIRMED and space.requires_approval else None,
                    },
                )
                created += was_created
        return created

    def _issues(self, users: dict, spaces: dict) -> None:
        for space_name, title, priority, status, blocks in ISSUES:
            Issue.objects.get_or_create(
                space=spaces[space_name],
                title=title,
                defaults={
                    "reported_by": users["asha"], "priority": priority, "status": status, "blocks_booking": blocks,
                    "resolved_at": timezone.now() if status == Issue.Status.RESOLVED else None,
                },
            )

    @staticmethod
    def _at(day, hour: float) -> datetime:
        whole = int(hour)
        return timezone.make_aware(datetime.combine(day, time(whole, int((hour - whole) * 60))))
