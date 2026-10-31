"""Login with your username OR email, ignoring upper/lower case ("Demo" works for "demo")."""
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q


class UsernameOrEmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()
        login = (username or kwargs.get(User.USERNAME_FIELD) or "").strip()
        if not login or password is None:
            return None

        # Prefer an exact username match, then any case-insensitive username/email match.
        user = (
            User.objects.filter(username=login).first()
            or User.objects.filter(Q(username__iexact=login) | Q(email__iexact=login)).order_by("id").first()
        )
        if user is None:
            # Hash anyway so "no such user" takes as long as "wrong password" (no username probing by timing).
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
