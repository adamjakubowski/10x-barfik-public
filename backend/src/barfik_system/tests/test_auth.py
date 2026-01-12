"""Testy dla endpointów auth i user."""
import pytest
from django.contrib.auth.models import User
from rest_framework import status


@pytest.mark.django_db
class TestRegistration:
    """Testy rejestracji użytkownika."""
    
    def test_register_success(self, api_client):
        """Test pomyślnej rejestracji."""
        data = {
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'first_name': 'Jan',
            'last_name': 'Kowalski'
        }
        
        response = api_client.post('/api/auth/register/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'id' in response.data
        assert response.data['email'] == 'newuser@example.com'
        
        # Sprawdź czy użytkownik został utworzony
        user = User.objects.get(email='newuser@example.com')
        assert user.username == 'newuser@example.com'
        assert user.first_name == 'Jan'
        assert user.last_name == 'Kowalski'
    
    def test_register_duplicate_email(self, api_client, user):
        """Test rejestracji z istniejącym emailem."""
        data = {
            'email': user.email,
            'password': 'SecurePass123!'
        }
        
        response = api_client.post('/api/auth/register/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data
    
    def test_register_weak_password(self, api_client):
        """Test rejestracji ze słabym hasłem."""
        data = {
            'email': 'test@example.com',
            'password': '123'  # Zbyt krótkie
        }
        
        response = api_client.post('/api/auth/register/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data


@pytest.mark.django_db
class TestLogin:
    """Testy logowania."""
    
    def test_login_success(self, api_client, user):
        """Test pomyślnego logowania."""
        data = {
            'username': user.username,
            'password': 'testpass123'
        }
        
        response = api_client.post('/api/auth/login/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
    
    def test_login_invalid_credentials(self, api_client, user):
        """Test logowania z błędnymi danymi."""
        data = {
            'username': user.username,
            'password': 'wrongpassword'
        }
        
        response = api_client.post('/api/auth/login/', data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserProfile:
    """Testy profilu użytkownika."""
    
    def test_get_me_authenticated(self, authenticated_client, user):
        """Test pobierania profilu zalogowanego użytkownika."""
        response = authenticated_client.get('/api/users/me/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
        assert response.data['id'] == user.id
    
    def test_get_me_unauthenticated(self, api_client):
        """Test pobierania profilu bez uwierzytelnienia."""
        response = api_client.get('/api/users/me/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_me(self, authenticated_client, user):
        """Test aktualizacji profilu."""
        data = {
            'first_name': 'Nowe',
            'last_name': 'Nazwisko'
        }
        
        response = authenticated_client.patch('/api/users/me/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'Nowe'
        assert response.data['last_name'] == 'Nazwisko'
        
        # Sprawdź czy zapisało się w bazie
        user.refresh_from_db()
        assert user.first_name == 'Nowe'
        assert user.last_name == 'Nazwisko'
