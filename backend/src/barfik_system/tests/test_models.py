"""Testy jednostkowe dla modeli - walidacje, automatyka, soft delete."""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from barfik_system.models import (
    Diet, Ingredient, Animal, Collaboration,
    Unit, IngredientCategory, AnimalType
)


@pytest.mark.django_db
class TestDietValidation:
    """Testy walidacji modelu Diet."""
    
    def test_diet_clean_start_after_end_raises_error(self, animal):
        """Test że start_date > end_date wyrzuca błąd walidacji."""
        diet = Diet(
            animal=animal,
            start_date=date(2026, 2, 1),
            end_date=date(2026, 1, 1)  # Przed start_date
        )
        
        with pytest.raises(ValidationError) as exc_info:
            diet.clean()
        
        assert 'Data rozpoczęcia nie może być późniejsza' in str(exc_info.value)
    
    def test_diet_clean_start_equals_end_is_valid(self, animal):
        """Test że start_date == end_date jest dozwolone."""
        diet = Diet(
            animal=animal,
            start_date=date(2026, 1, 15),
            end_date=date(2026, 1, 15)
        )
        
        # Nie powinno wyrzucić błędu
        diet.clean()
        diet.save()
        
        assert diet.id is not None
    
    def test_diet_end_date_can_be_null(self, animal):
        """Test że end_date może być null (dieta otwarta)."""
        diet = Diet.objects.create(
            animal=animal,
            start_date=date(2026, 1, 1),
            end_date=None
        )
        
        assert diet.end_date is None
        assert diet.is_active is True
    
    def test_diets_can_overlap(self, animal):
        """Test że diety mogą się nakładać (brak walidacji unikalności)."""
        Diet.objects.create(
            animal=animal,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31)
        )
        
        # Druga dieta nakładająca się
        diet2 = Diet.objects.create(
            animal=animal,
            start_date=date(2026, 1, 15),
            end_date=date(2026, 2, 15)
        )
        
        assert diet2.id is not None
        assert Diet.objects.filter(animal=animal).count() == 2


@pytest.mark.django_db
class TestIngredientAmountCalculation:
    """Testy automatycznego przeliczania amount_in_base_unit."""
    
    def test_ingredient_calculates_amount_in_base_unit_on_save(
        self, diet, unit_gram, category_meat
    ):
        """Test że amount_in_base_unit jest automatycznie wyliczane przy zapisie."""
        ingredient = Ingredient(
            diet=diet,
            name='Wołowina',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('500')
        )
        
        # Przed zapisem amount_in_base_unit wynosi 0 (default)
        assert ingredient.amount_in_base_unit == 0
        
        ingredient.save()
        
        # Po zapisie: 500 * 1.0 (conversion_factor gram) = 500
        assert ingredient.amount_in_base_unit == Decimal('500')
    
    def test_ingredient_with_kilogram_unit(self, diet, unit_kilogram, category_meat):
        """Test przeliczania z kilogramów na jednostkę bazową."""
        ingredient = Ingredient.objects.create(
            diet=diet,
            name='Kurczak',
            category=category_meat,
            cooking_method='cooked',
            unit=unit_kilogram,
            amount=Decimal('2.5')
        )
        
        # 2.5 kg * 1000 = 2500 (jednostka bazowa to gramy)
        assert ingredient.amount_in_base_unit == Decimal('2500')
    
    def test_ingredient_recalculates_on_update(self, diet, unit_gram, category_meat):
        """Test że amount_in_base_unit jest przeliczane przy aktualizacji."""
        ingredient = Ingredient.objects.create(
            diet=diet,
            name='Wątróbka',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('100')
        )
        
        assert ingredient.amount_in_base_unit == Decimal('100')
        
        # Zmień amount
        ingredient.amount = Decimal('200')
        ingredient.save()
        
        # Powinno przeliczyć ponownie
        assert ingredient.amount_in_base_unit == Decimal('200')
    
    def test_ingredient_min_amount_validator(self, diet, unit_gram, category_meat):
        """Test że amount < 0.001 jest odrzucane przez MinValueValidator."""
        ingredient = Ingredient(
            diet=diet,
            name='Test',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('0.0001')  # Poniżej minimum
        )
        
        # Walidacja podczas save() lub full_clean()
        with pytest.raises(ValidationError):
            ingredient.full_clean()


@pytest.mark.django_db
class TestSoftDelete:
    """Testy mechanizmu soft delete."""
    
    def test_soft_delete_animal_sets_is_active_false(self, animal):
        """Test że soft delete ustawia is_active=False."""
        animal_id = animal.id
        
        # Soft delete
        animal.is_active = False
        animal.save()
        
        # Nie jest widoczny przez domyślny manager
        assert not Animal.objects.filter(id=animal_id).exists()
        
        # Jest widoczny przez all_objects
        assert Animal.all_objects.filter(id=animal_id).exists()
        
        deleted_animal = Animal.all_objects.get(id=animal_id)
        assert deleted_animal.is_active is False
    
    def test_active_manager_filters_inactive(self, user, animal_type_dog):
        """Test że ActiveManager domyślnie filtruje is_active=True."""
        # Aktywne zwierzę
        active = Animal.objects.create(
            owner=user,
            species=animal_type_dog,
            name='Aktywny'
        )
        
        # Nieaktywne zwierzę
        inactive = Animal.objects.create(
            owner=user,
            species=animal_type_dog,
            name='Nieaktywny',
            is_active=False
        )
        
        # Domyślny manager widzi tylko aktywne
        assert Animal.objects.count() == 1
        assert Animal.objects.first().name == 'Aktywny'
        
        # all_objects widzi wszystkie
        assert Animal.all_objects.count() == 2
    
    def test_soft_delete_diet_with_ingredients(self, diet, unit_gram, category_meat):
        """Test że soft delete diety nie usuwa fizycznie składników."""
        # Utwórz składnik
        ingredient = Ingredient.objects.create(
            diet=diet,
            name='Kark',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('300')
        )
        
        # Soft delete diety
        diet.is_active = False
        diet.save()
        
        # Dieta nie widoczna przez objects
        assert not Diet.objects.filter(id=diet.id).exists()
        
        # Składnik nadal widoczny (soft delete nie kaskaduje automatycznie)
        assert Ingredient.objects.filter(id=ingredient.id).exists()
    
    def test_restore_soft_deleted_object(self, animal):
        """Test przywracania (restore) soft-deleted obiektu."""
        # Soft delete
        animal.is_active = False
        animal.save()
        
        assert not Animal.objects.filter(id=animal.id).exists()
        
        # Restore
        animal.is_active = True
        animal.save()
        
        # Ponownie widoczny
        assert Animal.objects.filter(id=animal.id).exists()


@pytest.mark.django_db
class TestCollaborationConstraints:
    """Testy ograniczeń modelu Collaboration."""
    
    def test_unique_active_collaboration_pair(self, animal, another_user):
        """Test że tylko jedna aktywna para (animal, user) może istnieć."""
        # Pierwsza aktywna współpraca
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        # Próba utworzenia drugiej aktywnej dla tej samej pary
        with pytest.raises(IntegrityError):
            Collaboration.objects.create(
                animal=animal,
                user=another_user,
                permission='EDIT'
            )
    
    def test_can_create_multiple_inactive_collaborations(self, animal, another_user):
        """Test że można mieć wiele nieaktywnych współprac dla tej samej pary."""
        # Pierwsza nieaktywna
        collab1 = Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY',
            is_active=False
        )
        
        # Druga nieaktywna - powinno działać
        collab2 = Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='EDIT',
            is_active=False
        )
        
        assert collab1.id != collab2.id
    
    def test_can_reactivate_after_soft_delete(self, animal, another_user):
        """Test że można reaktywować współpracę po soft delete."""
        collab = Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        # Soft delete
        collab.is_active = False
        collab.save()
        
        # Reaktywacja
        collab.is_active = True
        collab.save()
        
        assert Collaboration.objects.filter(
            animal=animal,
            user=another_user,
            is_active=True
        ).count() == 1


@pytest.mark.django_db
class TestTimestamps:
    """Testy mechanizmu timestampów (created_at, updated_at)."""
    
    def test_created_at_set_on_creation(self, user, animal_type_dog):
        """Test że created_at jest ustawiane przy tworzeniu."""
        animal = Animal.objects.create(
            owner=user,
            species=animal_type_dog,
            name='Timestamp Test'
        )
        
        assert animal.created_at is not None
        assert animal.updated_at is not None
    
    def test_updated_at_changes_on_save(self, animal):
        """Test że updated_at zmienia się przy zapisie."""
        import time
        
        original_updated = animal.updated_at
        
        time.sleep(0.1)  # Mała pauza
        
        animal.name = 'Nowa Nazwa'
        animal.save()
        
        assert animal.updated_at > original_updated
