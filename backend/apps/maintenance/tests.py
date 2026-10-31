from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.bookings.tests.factories import make_space, make_user
from apps.maintenance.models import Issue


class MaintenanceApiTests(APITestCase):
    def setUp(self):
        self.member = make_user()
        self.manager = make_user("manager", is_staff=True)
        self.space = make_space(name="Classroom B")

    def report(self, **extra):
        self.client.force_authenticate(self.member)
        payload = {"space": self.space.id, "title": "Projector broken", "priority": "high", **extra}
        return self.client.post(reverse("issue-list"), payload, format="json")

    def test_member_can_report_an_issue(self):
        response = self.report(blocks_booking=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "open")
        self.assertEqual(response.data["reported_by"], "asha")
        self.assertEqual(response.data["space_name"], "Classroom B")

    def test_member_cannot_set_status_when_reporting(self):
        response = self.report(status="resolved")
        self.assertEqual(response.data["status"], "open")  # read-only field is ignored

    def test_only_staff_change_status(self):
        issue_id = self.report().data["id"]
        url = reverse("issue-status", args=[issue_id])

        self.assertEqual(self.client.patch(url, {"status": "resolved"}, format="json").status_code, 403)

        self.client.force_authenticate(self.manager)
        response = self.client.patch(url, {"status": "resolved"}, format="json")
        self.assertEqual(response.data["status"], "resolved")
        self.assertIsNotNone(response.data["resolved_at"])

    def test_filter_unresolved(self):
        self.report()
        Issue.objects.create(space=self.space, title="Old", status=Issue.Status.RESOLVED)
        response = self.client.get(reverse("issue-list"), {"status": "unresolved"})
        self.assertEqual([i["title"] for i in response.data["results"]], ["Projector broken"])
