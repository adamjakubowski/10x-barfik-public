"""
Custom authentication backends for the barfik_system app.
"""

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from django.db.models import Q


class EmailOrUsernameBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in with either
    their email address or username.

    This is necessary because:
    - New users are registered with email as username
    - Some existing users may have traditional usernames
    - Frontend sends email during login
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate user by email or username.

        Args:
            request: The request object
            username: Email address or username
            password: User's password
            **kwargs: Additional keyword arguments

        Returns:
            User object if authentication successful, None otherwise
        """
        if username is None or password is None:
            return None

        try:
            # Try to find user by email first, then by username
            user = User.objects.get(
                Q(email__iexact=username) | Q(username__iexact=username)
            )
        except User.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a nonexistent user
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # In case of multiple users with same email (shouldn't happen
            # with proper validation), try exact username match
            try:
                user = User.objects.get(username__iexact=username)
            except (User.DoesNotExist, User.MultipleObjectsReturned):
                return None

        # Verify password and check if user is active
        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None
