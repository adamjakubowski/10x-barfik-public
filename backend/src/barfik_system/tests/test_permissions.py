"""Testy jednostkowe dla uprawnień (permissions)."""
import pytest
from unittest.mock import Mock
from barfik_system.models import Animal, Diet, Ingredient, Collaboration
from barfik_system.permissions import (
    AnimalAccessMixin,
    AnimalResourcePermission
)


@pytest.mark.django_db
class TestAnimalAccessMixin:
    """Testy mixinu AnimalAccessMixin."""
    
    def setup_method(self):
        """Setup dla każdego testu."""
        self.mixin = AnimalAccessMixin()
    
    def test_get_animal_from_animal_object(self, animal):
        """Test wyodrębniania Animal z obiektu Animal."""
        result = self.mixin.get_animal_from_object(animal)
        assert result == animal
    
    def test_get_animal_from_diet_object(self, diet):
        """Test wyodrębniania Animal z obiektu Diet."""
        result = self.mixin.get_animal_from_object(diet)
        assert result == diet.animal
    
    def test_get_animal_from_ingredient_object(
        self, diet, unit_gram, category_meat
    ):
        """Test wyodrębniania Animal z obiektu Ingredient."""
        ingredient = Ingredient.objects.create(
            diet=diet,
            name='Test',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=100
        )
        
        result = self.mixin.get_animal_from_object(ingredient)
        assert result == diet.animal
    
    def test_get_animal_from_collaboration_object(self, animal, another_user):
        """Test wyodrębniania Animal z obiektu Collaboration."""
        collab = Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        result = self.mixin.get_animal_from_object(collab)
        assert result == animal
    
    def test_get_animal_from_unknown_object_returns_none(self):
        """Test że nieznany typ obiektu zwraca None."""
        unknown_obj = Mock()
        result = self.mixin.get_animal_from_object(unknown_obj)
        assert result is None
    
    def test_get_user_permission_for_animal_owner(self, user, animal):
        """Test że właściciel ma poziom OWNER."""
        permission = self.mixin.get_user_permission_for_animal(user, animal)
        assert permission == 'OWNER'
    
    def test_get_user_permission_for_animal_read_only(
        self, another_user, animal
    ):
        """Test że współpracownik READ_ONLY jest rozpoznawany."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        permission = self.mixin.get_user_permission_for_animal(
            another_user, animal
        )
        assert permission == 'READ_ONLY'
    
    def test_get_user_permission_for_animal_edit(self, another_user, animal):
        """Test że współpracownik EDIT jest rozpoznawany."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='EDIT'
        )
        
        permission = self.mixin.get_user_permission_for_animal(
            another_user, animal
        )
        assert permission == 'EDIT'
    
    def test_get_user_permission_for_animal_no_access(
        self, another_user, animal
    ):
        """Test że użytkownik bez dostępu ma None."""
        permission = self.mixin.get_user_permission_for_animal(
            another_user, animal
        )
        assert permission is None
    
    def test_get_user_permission_ignores_inactive_collaboration(
        self, another_user, animal
    ):
        """Test że nieaktywna współpraca jest ignorowana."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='EDIT',
            is_active=False
        )
        
        permission = self.mixin.get_user_permission_for_animal(
            another_user, animal
        )
        assert permission is None


@pytest.mark.django_db
class TestAnimalResourcePermission:
    """Testy klasy AnimalResourcePermission."""
    
    def setup_method(self):
        """Setup dla każdego testu."""
        self.permission = AnimalResourcePermission()
    
    def test_has_permission_allows_list_for_all(self):
        """Test że LIST jest zawsze dozwolone (filtrujemy w queryset)."""
        request = Mock()
        view = Mock()
        view.action = 'list'
        
        result = self.permission.has_permission(request, view)
        assert result is True
    
    def test_has_object_permission_owner_full_access(self, user, animal):
        """Test że właściciel ma pełny dostęp (wszystkie metody)."""
        request = Mock()
        request.user = user
        request.method = 'DELETE'
        
        view = Mock()
        view.action = 'destroy'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is True
    
    def test_has_object_permission_read_only_can_read(
        self, another_user, animal
    ):
        """Test że READ_ONLY może czytać (GET, HEAD, OPTIONS)."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        request = Mock()
        request.user = another_user
        request.method = 'GET'
        
        view = Mock()
        view.action = 'retrieve'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is True
    
    def test_has_object_permission_read_only_cannot_edit(
        self, another_user, animal
    ):
        """Test że READ_ONLY nie może edytować."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        request = Mock()
        request.user = another_user
        request.method = 'PUT'
        
        view = Mock()
        view.action = 'update'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is False
    
    def test_has_object_permission_read_only_cannot_delete(
        self, another_user, animal
    ):
        """Test że READ_ONLY nie może kasować."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        request = Mock()
        request.user = another_user
        request.method = 'DELETE'
        
        view = Mock()
        view.action = 'destroy'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is False
    
    def test_has_object_permission_edit_can_read(self, another_user, animal):
        """Test że EDIT może czytać."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='EDIT'
        )
        
        request = Mock()
        request.user = another_user
        request.method = 'GET'
        
        view = Mock()
        view.action = 'retrieve'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is True
    
    def test_has_object_permission_edit_can_update(
        self, another_user, animal
    ):
        """Test że EDIT może edytować (PUT, PATCH)."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='EDIT'
        )
        
        request = Mock()
        request.user = another_user
        request.method = 'PATCH'
        
        view = Mock()
        view.action = 'partial_update'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is True
    
    def test_has_object_permission_edit_cannot_delete(
        self, another_user, animal
    ):
        """Test że EDIT nie może kasować (DELETE tylko dla OWNER)."""
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='EDIT'
        )
        
        request = Mock()
        request.user = another_user
        request.method = 'DELETE'
        
        view = Mock()
        view.action = 'destroy'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is False
    
    def test_has_object_permission_no_access_denies_all(
        self, another_user, animal
    ):
        """Test że użytkownik bez dostępu nie ma żadnych uprawnień."""
        request = Mock()
        request.user = another_user
        request.method = 'GET'
        
        view = Mock()
        view.action = 'retrieve'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is False
    
    def test_has_object_permission_works_with_diet(
        self, another_user, diet
    ):
        """Test uprawnień dla obiektu Diet (przez Animal)."""
        Collaboration.objects.create(
            animal=diet.animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        request = Mock()
        request.user = another_user
        request.method = 'GET'
        
        view = Mock()
        view.action = 'retrieve'
        
        result = self.permission.has_object_permission(request, view, diet)
        assert result is True
    
    def test_has_object_permission_works_with_ingredient(
        self, another_user, diet, unit_gram, category_meat
    ):
        """Test uprawnień dla obiektu Ingredient (przez Diet.animal)."""
        ingredient = Ingredient.objects.create(
            diet=diet,
            name='Test',
            category=category_meat,
            cooking_method='raw',
            unit=unit_gram,
            amount=100
        )
        
        Collaboration.objects.create(
            animal=diet.animal,
            user=another_user,
            permission='EDIT'
        )
        
        request = Mock()
        request.user = another_user
        request.method = 'PATCH'
        
        view = Mock()
        view.action = 'partial_update'
        
        result = self.permission.has_object_permission(
            request, view, ingredient
        )
        assert result is True


@pytest.mark.django_db
class TestOwnerOnlyPermission:
    """Testy dla zasobów tylko dla właściciela (np. Collaboration)."""
    
    def test_owner_only_denies_non_owner(self, another_user, animal):
        """Test że owner_only=True odrzuca nie-właścicieli."""
        permission = AnimalResourcePermission()
        permission.owner_only = True
        
        request = Mock()
        request.user = another_user
        request.method = 'POST'
        
        view = Mock()
        view.action = 'create'
        
        result = permission.has_object_permission(request, view, animal)
        assert result is False
    
    def test_owner_only_allows_owner(self, user, animal):
        """Test że owner_only=True dopuszcza właściciela."""
        permission = AnimalResourcePermission()
        permission.owner_only = True
        
        request = Mock()
        request.user = user
        request.method = 'POST'
        
        view = Mock()
        view.action = 'create'
        
        result = permission.has_object_permission(request, view, animal)
        assert result is True


@pytest.mark.django_db
class TestPermissionEdgeCases:
    """Testy przypadków brzegowych dla uprawnień."""
    
    def setup_method(self):
        """Setup dla każdego testu."""
        self.permission = AnimalResourcePermission()
    
    def test_unauthenticated_user_denied(self, animal, user):
        """Test że niezalogowany użytkownik jest odrzucany."""
        # W praktyce IsAuthenticated permission blokuje wcześniej,
        # ale testujemy że logika nie crashuje
        # Użyjemy innego użytkownika (bez dostępu) jako proxy
        from django.contrib.auth.models import User
        
        other_user = User.objects.create_user(
            username='noaccess@test.com',
            email='noaccess@test.com',
            password='test123'
        )
        
        request = Mock()
        request.user = other_user
        request.method = 'GET'
        
        view = Mock()
        view.action = 'retrieve'
        
        result = self.permission.has_object_permission(request, view, animal)
        assert result is False
    
    def test_multiple_collaborations_uses_highest_permission(
        self, another_user, animal
    ):
        """Test że przy wielu współpracach (edge case) używana jest pierwsza aktywna."""
        # Normalnie unique constraint blokuje, ale test dla logiki
        # W praktyce tylko jedna aktywna może istnieć
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='READ_ONLY'
        )
        
        # Druga (nieaktywna)
        Collaboration.objects.create(
            animal=animal,
            user=another_user,
            permission='EDIT',
            is_active=False
        )
        
        mixin = AnimalAccessMixin()
        permission = mixin.get_user_permission_for_animal(another_user, animal)
        
        # Powinna zwrócić aktywną (READ_ONLY)
        assert permission == 'READ_ONLY'
    
    def test_soft_deleted_animal_still_has_permissions(self, user, animal):
        """Test że soft-deleted zwierzę nadal ma uprawnienia (logika biznesowa)."""
        # Soft delete
        animal.is_active = False
        animal.save()
        
        mixin = AnimalAccessMixin()
        permission = mixin.get_user_permission_for_animal(user, animal)
        
        # Właściciel nadal ma dostęp (OWNER)
        assert permission == 'OWNER'
