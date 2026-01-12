"""Konfigurator pytest i fixtures dla testów."""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from barfik_system.models import (
    AnimalType, Unit, IngredientCategory,
    Animal, Diet, Ingredient
)


@pytest.fixture
def api_client():
    """Zwróć klienta API."""
    return APIClient()


@pytest.fixture
def user(db):
    """Utwórz użytkownika testowego."""
    return User.objects.create_user(
        username='testuser@example.com',
        email='testuser@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def another_user(db):
    """Utwórz drugiego użytkownika."""
    return User.objects.create_user(
        username='another@example.com',
        email='another@example.com',
        password='testpass123'
    )


@pytest.fixture
def animal_type_dog(db):
    """Utwórz gatunek pies."""
    return AnimalType.objects.create(name='Pies')


@pytest.fixture
def animal_type_cat(db):
    """Utwórz gatunek kot."""
    return AnimalType.objects.create(name='Kot')


@pytest.fixture
def unit_gram(db):
    """Utwórz jednostkę gram."""
    return Unit.objects.create(
        name='gram',
        symbol='g',
        conversion_factor=1.0
    )


@pytest.fixture
def unit_kilogram(db):
    """Utwórz jednostkę kilogram."""
    return Unit.objects.create(
        name='kilogram',
        symbol='kg',
        conversion_factor=1000.0
    )


@pytest.fixture
def category_meat(db):
    """Utwórz kategorię mięso."""
    return IngredientCategory.objects.create(
        code='meat',
        name='Mięso',
        description='Surowe lub gotowane mięso'
    )


@pytest.fixture
def category_veggies(db):
    """Utwórz kategorię warzywa."""
    return IngredientCategory.objects.create(
        code='veggies',
        name='Warzywa',
        description='Różne warzywa'
    )


@pytest.fixture
def animal(db, user, animal_type_dog):
    """Utwórz zwierzę testowe."""
    return Animal.objects.create(
        owner=user,
        species=animal_type_dog,
        name='Rex',
        weight_kg=25.5,
        note='Pies testowy'
    )


@pytest.fixture
def diet(db, animal):
    """Utwórz dietę testową."""
    from datetime import date
    return Diet.objects.create(
        animal=animal,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        description='Dieta testowa'
    )


@pytest.fixture
def ingredient(db, diet, unit_gram, category_meat):
    """Utwórz składnik testowy."""
    return Ingredient.objects.create(
        diet=diet,
        name='Wołowina',
        category=category_meat,
        cooking_method='raw',
        unit=unit_gram,
        amount=300.0
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Zwróć klienta z uwierzytelnieniem."""
    from rest_framework_simplejwt.tokens import RefreshToken
    
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    return api_client
