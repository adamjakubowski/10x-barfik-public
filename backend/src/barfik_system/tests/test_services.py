"""Testy jednostkowe warstwy serwisowej - logika biznesowa."""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from barfik_system.models import (
    Diet, Ingredient, ShoppingList, ShoppingListItem,
    Collaboration, Animal
)
from barfik_system.services import (
    recalculate_diet_total,
    create_ingredient,
    update_ingredient,
    delete_ingredient,
    generate_shopping_list,
    regenerate_shopping_list,
    get_accessible_animals,
    get_accessible_diets,
    validate_collaboration,
    create_collaboration,
    get_dashboard_stats
)


@pytest.mark.django_db
class TestRecalculateDietTotal:
    """Testy funkcji recalculate_diet_total."""
    
    def test_calculates_total_from_ingredients(self, diet, unit_gram, category_meat):
        """Test że total_daily_mass jest sumą amount_in_base_unit składników."""
        # Dodaj składniki
        Ingredient.objects.create(
            diet=diet,
            name='Wołowina',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('500')  # 500g
        )
        
        Ingredient.objects.create(
            diet=diet,
            name='Kurczak',
            category=category_meat,
            cooking_method='cooked',
            unit=unit_gram,
            amount=Decimal('300')  # 300g
        )
        
        total = recalculate_diet_total(diet.id)
        
        # 500 + 300 = 800
        assert total == Decimal('800')
        
        diet.refresh_from_db()
        assert diet.total_daily_mass == Decimal('800')
    
    def test_calculates_zero_for_diet_without_ingredients(self, diet):
        """Test że dieta bez składników ma total_daily_mass = 0."""
        total = recalculate_diet_total(diet.id)
        
        assert total == Decimal('0')
        
        diet.refresh_from_db()
        assert diet.total_daily_mass == Decimal('0')
    
    def test_ignores_inactive_ingredients(self, diet, unit_gram, category_meat):
        """Test że nieaktywne składniki nie są wliczane do total."""
        # Aktywny składnik
        Ingredient.objects.create(
            diet=diet,
            name='Aktywny',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('500')
        )
        
        # Nieaktywny składnik
        Ingredient.objects.create(
            diet=diet,
            name='Nieaktywny',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('300'),
            is_active=False
        )
        
        total = recalculate_diet_total(diet.id)
        
        # Tylko aktywny: 500
        assert total == Decimal('500')
    
    def test_returns_zero_for_nonexistent_diet(self):
        """Test że zwraca 0 dla nieistniejącej diety."""
        total = recalculate_diet_total(99999)
        assert total == Decimal('0')


@pytest.mark.django_db
class TestIngredientServices:
    """Testy serwisów związanych ze składnikami."""
    
    def test_create_ingredient_updates_diet_total(self, diet, unit_gram, category_meat):
        """Test że create_ingredient aktualizuje total_daily_mass."""
        diet.total_daily_mass = Decimal('0')
        diet.save()
        
        ingredient = create_ingredient(
            diet_id=diet.id,
            name='Wołowina',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('600')
        )
        
        assert ingredient.id is not None
        
        diet.refresh_from_db()
        assert diet.total_daily_mass == Decimal('600')
    
    def test_update_ingredient_recalculates_diet_total(
        self, diet, unit_gram, category_meat
    ):
        """Test że update_ingredient przelicza total_daily_mass."""
        ingredient = Ingredient.objects.create(
            diet=diet,
            name='Kurczak',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('400')
        )
        
        recalculate_diet_total(diet.id)
        diet.refresh_from_db()
        assert diet.total_daily_mass == Decimal('400')
        
        # Zaktualizuj składnik
        updated = update_ingredient(ingredient.id, amount=Decimal('800'))
        
        assert updated.amount == Decimal('800')
        
        diet.refresh_from_db()
        assert diet.total_daily_mass == Decimal('800')
    
    def test_delete_ingredient_recalculates_diet_total(
        self, diet, unit_gram, category_meat
    ):
        """Test że delete_ingredient (soft delete) przelicza total."""
        ingredient1 = Ingredient.objects.create(
            diet=diet,
            name='Składnik1',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('500')
        )
        
        ingredient2 = Ingredient.objects.create(
            diet=diet,
            name='Składnik2',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('300')
        )
        
        recalculate_diet_total(diet.id)
        diet.refresh_from_db()
        assert diet.total_daily_mass == Decimal('800')
        
        # Usuń składnik1
        delete_ingredient(ingredient1.id)
        
        diet.refresh_from_db()
        assert diet.total_daily_mass == Decimal('300')  # Tylko składnik2
        
        # Sprawdź soft delete
        ingredient1.refresh_from_db()
        assert ingredient1.is_active is False
    
    def test_delete_ingredient_returns_false_for_nonexistent(self):
        """Test że delete_ingredient zwraca False dla nieistniejącego składnika."""
        result = delete_ingredient(99999)
        assert result is False


@pytest.mark.django_db
class TestShoppingListGeneration:
    """Testy generowania list zakupów."""
    
    def test_generate_shopping_list_basic(
        self, user, diet, unit_gram, category_meat
    ):
        """Test podstawowego generowania listy zakupów."""
        # Dodaj składniki
        Ingredient.objects.create(
            diet=diet,
            name='Wołowina',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('500')
        )
        
        # Generuj listę na 7 dni
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=7,
            title='Test Lista'
        )
        
        assert shopping_list.title == 'Test Lista'
        assert shopping_list.days_count == 7
        assert shopping_list.is_completed is False
        
        # Sprawdź pozycje
        items = shopping_list.items.all()
        assert items.count() == 1
        
        item = items.first()
        assert item.ingredient_name == 'Wołowina'
        assert item.total_amount == Decimal('3500')  # 500 * 7
    
    def test_generate_shopping_list_aggregates_by_name(
        self, user, animal, animal_type_dog, unit_gram, category_meat
    ):
        """Test że składniki o tej samej nazwie są agregowane."""
        # Dwie diety
        diet1 = Diet.objects.create(
            animal=animal,
            start_date=date(2026, 1, 1)
        )
        
        diet2 = Diet.objects.create(
            animal=animal,
            start_date=date(2026, 2, 1)
        )
        
        # Ta sama nazwa składnika w obu dietach
        Ingredient.objects.create(
            diet=diet1,
            name='Kark wołowy',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('400')
        )
        
        Ingredient.objects.create(
            diet=diet2,
            name='Kark wołowy',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('300')
        )
        
        # Generuj listę
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet1.id, diet2.id],
            days_count=3
        )
        
        items = shopping_list.items.all()
        assert items.count() == 1
        
        item = items.first()
        assert item.ingredient_name == 'Kark wołowy'
        # (400 + 300) * 3 = 2100
        assert item.total_amount == Decimal('2100')
    
    def test_generate_shopping_list_case_insensitive_aggregation(
        self, user, diet, unit_gram, category_meat
    ):
        """Test że agregacja jest case-insensitive."""
        # Składniki z różną wielkością liter
        Ingredient.objects.create(
            diet=diet,
            name='Marchewka',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('100')
        )
        
        Ingredient.objects.create(
            diet=diet,
            name='MARCHEWKA',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('50')
        )
        
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=1
        )
        
        items = shopping_list.items.all()
        # Powinny zostać zagregowane w jedną pozycję
        assert items.count() == 1
        assert items.first().total_amount == Decimal('150')
    
    def test_generate_shopping_list_ignores_inactive_ingredients(
        self, user, diet, unit_gram, category_meat
    ):
        """Test że nieaktywne składniki są pomijane."""
        Ingredient.objects.create(
            diet=diet,
            name='Aktywny',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('500')
        )
        
        Ingredient.objects.create(
            diet=diet,
            name='Nieaktywny',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('300'),
            is_active=False
        )
        
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=1
        )
        
        items = shopping_list.items.all()
        assert items.count() == 1
        assert items.first().ingredient_name == 'Aktywny'
    
    def test_generate_shopping_list_raises_for_no_diets(self, user):
        """Test że ValueError jest wyrzucany gdy brak diet."""
        with pytest.raises(ValueError) as exc_info:
            generate_shopping_list(
                user=user,
                diet_ids=[],
                days_count=7
            )
        
        assert 'Nie znaleziono aktywnych diet' in str(exc_info.value)
    
    def test_generate_shopping_list_sets_default_title(self, user, diet):
        """Test że domyślny tytuł jest generowany jeśli nie podano."""
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=5
        )
        
        assert shopping_list.title == 'Lista zakupów (5 dni)'


@pytest.mark.django_db
class TestRegenerateShoppingList:
    """Testy regenerowania listy zakupów."""
    
    def test_regenerate_clears_old_items_and_creates_new(
        self, user, diet, unit_gram, category_meat
    ):
        """Test że regeneracja usuwa stare pozycje i tworzy nowe."""
        # Utwórz listę
        Ingredient.objects.create(
            diet=diet,
            name='Składnik1',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('300')
        )
        
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=3
        )
        
        old_item_id = shopping_list.items.first().id
        
        # Dodaj nowy składnik
        Ingredient.objects.create(
            diet=diet,
            name='Składnik2',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=Decimal('200')
        )
        
        # Regeneruj
        regenerated = regenerate_shopping_list(shopping_list.id)
        
        # Stary item powinien być nieaktywny
        old_item = ShoppingListItem.all_objects.get(id=old_item_id)
        assert old_item.is_active is False
        
        # Nowe items
        active_items = regenerated.items.all()
        assert active_items.count() == 2
    
    def test_regenerate_unmarks_completed(self, user, diet):
        """Test że regeneracja odznacza is_completed."""
        shopping_list = generate_shopping_list(
            user=user,
            diet_ids=[diet.id],
            days_count=1
        )
        
        # Oznacz jako ukończoną
        shopping_list.is_completed = True
        shopping_list.save()
        
        # Regeneruj
        regenerated = regenerate_shopping_list(shopping_list.id)
        
        assert regenerated.is_completed is False


@pytest.mark.django_db
class TestCollaborationServices:
    """Testy serwisów związanych z Collaboration."""
    
    def test_validate_collaboration_rejects_owner(self, animal, user):
        """Test że walidacja odrzuca właściciela jako współpracownika."""
        result = validate_collaboration(animal, user)
        
        assert result['valid'] is False
        assert 'właściciela' in result['error']
    
    def test_validate_collaboration_rejects_duplicate(self, animal, another_user):
        """Test że walidacja odrzuca duplikat aktywnej współpracy."""
        # Utwórz współpracę
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        result = validate_collaboration(animal, another_user)
        
        assert result['valid'] is False
        assert 'już ma aktywną' in result['error']
    
    def test_validate_collaboration_accepts_valid(self, animal, another_user):
        """Test że walidacja akceptuje poprawne dane."""
        result = validate_collaboration(animal, another_user)
        
        assert result['valid'] is True
        assert result['error'] is None
    
    def test_create_collaboration_raises_on_invalid(self, animal, user):
        """Test że create_collaboration wyrzuca ValueError przy błędnej walidacji."""
        with pytest.raises(ValueError) as exc_info:
            create_collaboration(animal, user, 'READ_ONLY')
        
        assert 'właściciela' in str(exc_info.value)
    
    def test_create_collaboration_sets_default_permission(self, animal, another_user):
        """Test że domyślne uprawnienie to READ_ONLY."""
        collab = create_collaboration(animal, another_user)
        
        assert collab.permission == 'READ_ONLY'
        assert collab.is_active is True
    
    def test_create_collaboration_with_edit_permission(self, animal, another_user):
        """Test tworzenia współpracy z uprawnieniami EDIT."""
        collab = create_collaboration(animal, another_user, permission='EDIT')
        
        assert collab.permission == 'EDIT'


@pytest.mark.django_db
class TestAccessibleResourcesFilters:
    """Testy filtrów dostępnych zasobów."""
    
    def test_get_accessible_animals_includes_owned(self, user, animal_type_dog):
        """Test że get_accessible_animals zwraca zwierzęta użytkownika."""
        owned = Animal.objects.create(
            owner=user,
            species=animal_type_dog,
            name='Moje'
        )
        
        q_filter = get_accessible_animals(user)
        animals = Animal.objects.filter(q_filter)
        
        assert animals.count() == 1
        assert owned in animals
    
    def test_get_accessible_animals_includes_collaborated(
        self, user, another_user, animal_type_dog
    ):
        """Test że get_accessible_animals zwraca zwierzęta z Collaboration."""
        # Zwierzę innego użytkownika
        other_animal = Animal.objects.create(
            owner=another_user,
            species=animal_type_dog,
            name='Nie Moje'
        )
        
        # Dodaj współpracę
        Collaboration.objects.create(
            animal=other_animal,
            user=user,
            permission='READ_ONLY'
        )
        
        q_filter = get_accessible_animals(user)
        animals = Animal.objects.filter(q_filter).distinct()
        
        assert other_animal in animals
    
    def test_get_accessible_animals_excludes_inactive_collaborations(
        self, user, another_user, animal_type_dog
    ):
        """Test że nieaktywne współprace są pomijane."""
        other_animal = Animal.objects.create(
            owner=another_user,
            species=animal_type_dog,
            name='Inne'
        )
        
        # Nieaktywna współpraca
        Collaboration.objects.create(
            animal=other_animal,
            user=user,
            permission='READ_ONLY',
            is_active=False
        )
        
        q_filter = get_accessible_animals(user)
        animals = Animal.objects.filter(q_filter).distinct()
        
        assert other_animal not in animals
    
    def test_get_accessible_diets_includes_owned_animal_diets(self, user, animal):
        """Test że get_accessible_diets zwraca diety zwierząt użytkownika."""
        diet = Diet.objects.create(
            animal=animal,
            start_date=date(2026, 1, 1)
        )
        
        q_filter = get_accessible_diets(user)
        diets = Diet.objects.filter(q_filter)
        
        assert diet in diets
    
    def test_get_accessible_diets_includes_collaborated_diets(
        self, user, another_user, animal_type_dog
    ):
        """Test że get_accessible_diets zwraca diety z Collaboration."""
        other_animal = Animal.objects.create(
            owner=another_user,
            species=animal_type_dog,
            name='Inne'
        )
        
        diet = Diet.objects.create(
            animal=other_animal,
            start_date=date(2026, 1, 1)
        )
        
        Collaboration.objects.create(
            animal=other_animal,
            user=user,
            permission='READ_ONLY'
        )
        
        q_filter = get_accessible_diets(user)
        diets = Diet.objects.filter(q_filter).distinct()
        
        assert diet in diets


@pytest.mark.django_db
class TestDashboardStats:
    """Testy funkcji get_dashboard_stats."""
    
    def test_dashboard_counts_active_animals(self, user, animal):
        """Test liczenia aktywnych zwierząt."""
        stats = get_dashboard_stats(user)
        
        assert stats['stats']['animals_count'] == 1
    
    def test_dashboard_counts_active_diets(self, user, animal):
        """Test liczenia aktywnych diet."""
        # Dieta obowiązująca dziś
        Diet.objects.create(
            animal=animal,
            start_date=date.today() - timedelta(days=5),
            end_date=date.today() + timedelta(days=10)
        )
        
        stats = get_dashboard_stats(user)
        
        assert stats['stats']['active_diets_count'] == 1
    
    def test_dashboard_identifies_expiring_diets(self, user, animal):
        """Test wykrywania diet wygasających w ciągu 7 dni."""
        # Dieta kończąca się za 5 dni
        Diet.objects.create(
            animal=animal,
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() + timedelta(days=5)
        )
        
        stats = get_dashboard_stats(user)
        
        assert stats['stats']['expiring_diets_count'] == 1
        assert len(stats['alerts']['expiring_diets']) == 1
        assert stats['alerts']['expiring_diets'][0]['days_left'] == 5
    
    def test_dashboard_identifies_animals_without_diet(
        self, user, animal_type_dog
    ):
        """Test wykrywania zwierząt bez aktywnej diety."""
        # Zwierzę bez diety
        Animal.objects.create(
            owner=user,
            species=animal_type_dog,
            name='Bez Diety'
        )
        
        stats = get_dashboard_stats(user)
        
        assert len(stats['alerts']['animals_without_diet']) == 1
        assert stats['alerts']['animals_without_diet'][0]['name'] == 'Bez Diety'
    
    def test_dashboard_identifies_old_shopping_lists(self, user, animal):
        """Test wykrywania starych nieukończonych list zakupów."""
        diet = Diet.objects.create(
            animal=animal,
            start_date=date.today()
        )
        
        # Stara lista (> 7 dni)
        old_list = ShoppingList.objects.create(
            created_by=user,
            days_count=7,
            is_completed=False
        )
        old_list.diets.add(diet)
        
        # Ręcznie ustaw created_at na 10 dni temu
        from django.utils import timezone
        old_list.created_at = timezone.now() - timedelta(days=10)
        old_list.save()
        
        stats = get_dashboard_stats(user)
        
        assert len(stats['alerts']['old_shopping_lists']) == 1
        assert stats['alerts']['old_shopping_lists'][0]['days_old'] == 10
    
    def test_dashboard_respects_collaboration_access(
        self, user, another_user, animal_type_dog
    ):
        """Test że dashboard uwzględnia dostęp przez Collaboration."""
        # Zwierzę innego użytkownika
        other_animal = Animal.objects.create(
            owner=another_user,
            species=animal_type_dog,
            name='Współdzielone'
        )
        
        # Dodaj współpracę
        Collaboration.objects.create(
            animal=other_animal,
            user=user,
            permission='READ_ONLY'
        )
        
        stats = get_dashboard_stats(user)
        
        # Powinno liczyć współdzielone zwierzę
        assert stats['stats']['animals_count'] == 1
