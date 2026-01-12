"""Testy dla list zakupów."""
import pytest
from datetime import date
from rest_framework import status
from barfik_system.models import Diet, Ingredient, ShoppingList


@pytest.mark.django_db
class TestShoppingListGeneration:
    """Testy generowania list zakupów."""
    
    def test_create_shopping_list(
        self, authenticated_client, diet, ingredient, unit_gram, category_meat
    ):
        """Test tworzenia listy zakupów."""
        # Dodaj drugi składnik
        Ingredient.objects.create(
            diet=diet,
            name='Kurczak',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=200.0
        )
        
        data = {
            'title': 'Zakupy na tydzień',
            'diets': [diet.id],
            'days_count': 7
        }
        
        response = authenticated_client.post('/api/shopping-lists/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Zakupy na tydzień'
        assert response.data['days_count'] == 7
        assert 'items' in response.data
        
        # Sprawdź pozycje
        # Powinny być 2 pozycje (Wołowina, Kurczak)
        assert len(response.data['items']) == 2
    
    def test_shopping_list_aggregates_amounts(
        self, authenticated_client, user, animal, unit_gram, category_meat
    ):
        """Test agregacji ilości składników."""
        # Utwórz dwie diety
        diet1 = Diet.objects.create(
            animal=animal,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 15)
        )
        diet2 = Diet.objects.create(
            animal=animal,
            start_date=date(2025, 1, 16),
            end_date=date(2025, 1, 31)
        )
        
        # Ten sam składnik w obu dietach
        Ingredient.objects.create(
            diet=diet1,
            name='Wołowina',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=300.0
        )
        Ingredient.objects.create(
            diet=diet2,
            name='Wołowina',  # Ta sama nazwa
            category=category_meat,
            cooking_method='cooked',  # Inny cooking_method
            unit=unit_gram,
            amount=200.0
        )
        
        data = {
            'title': 'Test agregacji',
            'diets': [diet1.id, diet2.id],
            'days_count': 1
        }
        
        response = authenticated_client.post('/api/shopping-lists/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Powinna być 1 pozycja z sumą (300 + 200 = 500)
        assert len(response.data['items']) == 1
        assert float(response.data['items'][0]['total_amount']) == 500.0
    
    def test_shopping_list_multiplies_by_days(
        self, authenticated_client, diet, ingredient
    ):
        """Test mnożenia składników przez days_count."""
        data = {
            'title': 'Zakupy na 7 dni',
            'diets': [diet.id],
            'days_count': 7
        }
        
        response = authenticated_client.post('/api/shopping-lists/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Ingredient ma 300g, więc 300 * 7 = 2100g
        assert len(response.data['items']) == 1
        assert float(response.data['items'][0]['total_amount']) == 2100.0
    
    def test_list_shopping_lists(self, authenticated_client, user, diet):
        """Test listowania list zakupów."""
        from barfik_system.services import generate_shopping_list
        
        # Utwórz listę
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=7,
            title='Test'
        )
        
        response = authenticated_client.get('/api/shopping-lists/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
    
    def test_complete_shopping_list(self, authenticated_client, user, diet):
        """Test oznaczania listy jako ukończonej."""
        from barfik_system.services import generate_shopping_list
        
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=7
        )
        
        response = authenticated_client.post(
            f'/api/shopping-lists/{shopping_list.id}/complete/',
            format='json',
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_completed'] is True
        
        # Sprawdź w bazie
        shopping_list.refresh_from_db()
        assert shopping_list.is_completed is True
    
    def test_check_shopping_list_item(self, authenticated_client, user, diet, ingredient):
        """Test zaznaczania pozycji jako kupionej."""
        from barfik_system.services import generate_shopping_list
        
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=1
        )
        
        item = shopping_list.items.first()
        
        response = authenticated_client.post(
            f'/api/shopping-lists/{shopping_list.id}/items/{item.id}/check/',
            format='json',
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_checked'] is True
        
        # Sprawdź w bazie
        item.refresh_from_db()
        assert item.is_checked is True


@pytest.mark.django_db
class TestShoppingListPermissions:
    """Testy uprawnień dla list zakupów."""
    
    def test_user_cannot_see_other_users_lists(
        self, api_client, user, another_user, diet
    ):
        """Test że użytkownik nie widzi cudzych list."""
        from barfik_system.services import generate_shopping_list
        from rest_framework_simplejwt.tokens import RefreshToken
        
        # Utwórz listę dla user
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=1
        )
        
        # Zaloguj jako another_user
        refresh = RefreshToken.for_user(another_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/shopping-lists/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 0  # Nie widzi listy user
