"""Testy dla endpointów zwierząt."""
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from barfik_system.models import Animal, Collaboration


@pytest.mark.django_db
class TestAnimalCRUD:
    """Testy CRUD dla zwierząt."""
    
    def test_list_animals(self, authenticated_client, animal):
        """Test listowania zwierząt."""
        response = authenticated_client.get('/api/animals/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Rex'
    
    def test_list_animals_unauthenticated(self, api_client):
        """Test listowania bez uwierzytelnienia."""
        response = api_client.get('/api/animals/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_animal(self, authenticated_client, animal_type_dog):
        """Test tworzenia zwierzęcia."""
        data = {
            'species_id': animal_type_dog.id,
            'name': 'Burek',
            'weight_kg': 30.5,
            'note': 'Nowy pies'
        }
        
        response = authenticated_client.post('/api/animals/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Burek'
        assert float(response.data['weight_kg']) == 30.5
        
        # Sprawdź czy został utworzony w bazie
        animal = Animal.objects.get(name='Burek')
        assert animal.owner.email == 'testuser@example.com'
    
    def test_get_animal_detail(self, authenticated_client, animal):
        """Test pobierania szczegółów zwierzęcia."""
        response = authenticated_client.get(f'/api/animals/{animal.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Rex'
        assert response.data['species']['name'] == 'Pies'
    
    def test_update_animal(self, authenticated_client, animal):
        """Test aktualizacji zwierzęcia."""
        data = {
            'weight_kg': 26.0
        }
        
        response = authenticated_client.patch(f'/api/animals/{animal.id}/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert float(response.data['weight_kg']) == 26.0
        
        # Sprawdź w bazie
        animal.refresh_from_db()
        assert float(animal.weight_kg) == 26.0
    
    def test_delete_animal(self, authenticated_client, animal):
        """Test usuwania zwierzęcia (soft delete)."""
        response = authenticated_client.delete(f'/api/animals/{animal.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Sprawdź soft delete
        animal.refresh_from_db()
        assert animal.is_active is False
    
    def test_cannot_access_other_user_animal(self, api_client, another_user, animal):
        """Test że użytkownik nie może zobaczyć cudzego zwierzęcia."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(another_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get(f'/api/animals/{animal.id}/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAnimalSearch:
    """Testy wyszukiwania zwierząt."""
    
    def test_search_by_name(self, authenticated_client, user, animal_type_dog):
        """Test wyszukiwania po nazwie."""
        Animal.objects.create(
            owner=user,
            species=animal_type_dog,
            name='Burek'
        )
        Animal.objects.create(
            owner=user,
            species=animal_type_dog,
            name='Azor'
        )
        
        response = authenticated_client.get('/api/animals/?search=Burek')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Burek'
    
    def test_filter_by_species(self, authenticated_client, user, animal_type_dog, animal_type_cat):
        """Test filtrowania po gatunku."""
        Animal.objects.create(owner=user, species=animal_type_dog, name='Pies1')
        Animal.objects.create(owner=user, species=animal_type_cat, name='Kot1')
        
        response = authenticated_client.get(f'/api/animals/?species_id={animal_type_dog.id}')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Pies1'


@pytest.mark.django_db
class TestCollaboration:
    """Testy współpracy."""
    
    def test_create_collaboration(self, authenticated_client, animal, another_user):
        """Test dodawania współpracownika."""
        data = {
            'user': another_user.id,
            'permission': 'READ_ONLY'
        }
        
        response = authenticated_client.post(
            f'/api/animals/{animal.id}/collaborations/',
            data,
            format='json',
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Sprawdź w bazie
        collab = Collaboration.objects.get(animal=animal, user=another_user)
        assert collab.permission == 'READ_ONLY'
    
    def test_collaborator_can_read(self, api_client, animal, another_user):
        """Test że współpracownik może czytać."""
        # Dodaj współpracę
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        # Zaloguj jako drugi użytkownik
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(another_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get(f'/api/animals/{animal.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Rex'
    
    def test_readonly_collaborator_cannot_edit(self, api_client, animal, another_user):
        """Test że READ_ONLY nie może edytować."""
        # Dodaj współpracę
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        # Zaloguj jako drugi użytkownik
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(another_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        data = {'weight_kg': 30.0}
        response = api_client.patch(f'/api/animals/{animal.id}/', data, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_edit_collaborator_can_edit(self, api_client: APIClient, animal, another_user):
        """Test że EDIT może edytować."""
        # Dodaj współpracę
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='EDIT'
        )
        
        # Zaloguj jako drugi użytkownik
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(another_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        data = {'weight_kg': 30.0}
        response = api_client.patch(f'/api/animals/{animal.id}/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
