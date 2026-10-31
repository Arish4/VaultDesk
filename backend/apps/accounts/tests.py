from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AuthApiTests(APITestCase):
    def test_register_login_and_me(self):
        register = self.client.post(
            reverse("register"),
            {"username": "asha", "email": "Asha@Example.com", "password": "S3cure-pass!"},
            format="json",
        )
        self.assertEqual(register.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", register.data)
        self.assertEqual(register.data["email"], "asha@example.com")

        token = self.client.post(reverse("token"), {"username": "asha", "password": "S3cure-pass!"}, format="json")
        self.assertEqual(token.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
        me = self.client.get(reverse("me"))
        self.assertEqual(me.data["username"], "asha")

    def login(self, username, password="S3cure-pass!"):
        return self.client.post(reverse("token"), {"username": username, "password": password}, format="json")

    def test_login_ignores_case_and_spaces(self):
        get_user_model().objects.create_user("demo", "demo@vaultdesk.local", "S3cure-pass!")
        self.assertEqual(self.login("Demo").status_code, status.HTTP_200_OK)
        self.assertEqual(self.login("  DEMO ").status_code, status.HTTP_200_OK)

    def test_login_with_email(self):
        get_user_model().objects.create_user("demo", "demo@vaultdesk.local", "S3cure-pass!")
        self.assertEqual(self.login("Demo@VaultDesk.local").status_code, status.HTTP_200_OK)

    def test_wrong_password_is_rejected(self):
        get_user_model().objects.create_user("demo", "demo@vaultdesk.local", "S3cure-pass!")
        self.assertEqual(self.login("demo", "nope").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.login("nobody").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_username_must_be_unique_ignoring_case(self):
        get_user_model().objects.create_user("asha", "asha@example.com", "S3cure-pass!")
        response = self.client.post(
            reverse("register"), {"username": "Asha", "email": "other@example.com", "password": "S3cure-pass!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_rejects_weak_password(self):
        response = self.client.post(
            reverse("register"), {"username": "x", "email": "x@example.com", "password": "123"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
