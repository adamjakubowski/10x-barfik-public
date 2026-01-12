"""Uprawnienia DRF dla aplikacji Barfik."""
from rest_framework import permissions
from django.db.models import Q
from .models import Animal, Collaboration, Diet, Ingredient


class AnimalAccessMixin:
    """
    Mixin do rozwiązywania praw dostępu do zasobów powiązanych ze zwierzęciem.

    Zapewnia wspólną logikę dla:
    - Wyodrębniania obiektu Animal z różnych typów modeli
    - Sprawdzania poziomu uprawnień użytkownika do zwierzęcia
    """

    def get_animal_from_object(self, obj):
        """
        Wyodrębnij obiekt Animal z różnych typów modeli.

        Args:
            obj: Obiekt modelu (Animal, Diet, Ingredient, Collaboration)

        Returns:
            Animal lub None jeśli nie można określić zwierzęcia
        """
        if isinstance(obj, Animal):
            return obj
        if isinstance(obj, Ingredient):
            return obj.diet.animal
        if isinstance(obj, (Diet, Collaboration)):
            return obj.animal
        return None

    def get_user_permission_for_animal(self, user, animal):
        """
        Sprawdź poziom uprawnień użytkownika do zwierzęcia.

        WAŻNE: Dla optymalnej wydajności, queryset w widoku powinien używać:
        - select_related('animal__owner') dla obiektów z relacją do Animal
        - prefetch_related(Prefetch('animal__collaborations',
            queryset=Collaboration.objects.filter(is_active=True)))

        Args:
            user: Obiekt użytkownika
            animal: Obiekt Animal

        Returns:
            str: 'OWNER', 'EDIT', 'READ_ONLY' lub None
        """
        if animal.owner == user:
            return 'OWNER'

        # Sprawdź czy collaborations są już prefetched
        if hasattr(animal, '_prefetched_objects_cache') and 'collaborations' in animal._prefetched_objects_cache:
            # Użyj prefetched data
            for collaboration in animal.collaborations.all():
                if collaboration.user == user and collaboration.is_active:
                    return collaboration.permission
            return None

        # Fallback: query do bazy danych
        collaboration = Collaboration.objects.filter(
            animal=animal,
            user=user,
            is_active=True
        ).values_list('permission', flat=True).first()

        return collaboration


class AnimalResourcePermission(permissions.BasePermission, AnimalAccessMixin):
    """
    Ujednolicone uprawnienie dla wszystkich zasobów powiązanych ze zwierzęciem.

    Poziomy dostępu:
    - OWNER: Pełny dostęp (CRUD)
    - EDIT: Tworzenie, odczyt, aktualizacja (bez DELETE)
    - READ_ONLY: Tylko odczyt (GET, HEAD, OPTIONS)

    Używane dla: Animal, Diet, Ingredient, Collaboration
    """

    # Flaga określająca czy tylko właściciel ma dostęp
    owner_only = False

    # Flaga określająca czy użytkownicy z EDIT mogą tworzyć zasoby
    allow_edit_create = False

    def has_permission(self, request, view):
        """
        Sprawdź uprawnienia na poziomie widoku (dla LIST i CREATE).
        """
        # Dla LIST - zawsze pozwalamy (filtrujemy w queryset)
        if view.action == 'list':
            return True

        # Dla CREATE - sprawdzamy animal_id w danych
        if request.method == 'POST' and self.allow_edit_create:
            animal_id = self._get_animal_id_from_request(request, view)

            if animal_id:
                try:
                    animal = Animal.objects.get(id=animal_id, is_active=True)

                    # Właściciel może wszystko
                    if animal.owner == request.user:
                        return True

                    # Współpracownik z EDIT może tworzyć
                    permission = self.get_user_permission_for_animal(request.user, animal)
                    return permission == 'EDIT'

                except Animal.DoesNotExist:
                    # Zwróć False - DRF zwróci 403, co jest OK dla nieistniejącego zasobu
                    return False

        return True

    def has_object_permission(self, request, view, obj):
        """Sprawdź uprawnienia na poziomie obiektu."""
        animal = self.get_animal_from_object(obj)

        if not animal:
            return False

        permission = self.get_user_permission_for_animal(request.user, animal)

        if not permission:
            return False

        # Tylko właściciel
        if self.owner_only:
            return permission == 'OWNER'

        # Właściciel ma pełny dostęp
        if permission == 'OWNER':
            return True

        # EDIT - wszystko oprócz DELETE
        if permission == 'EDIT':
            return request.method != 'DELETE'

        # READ_ONLY - tylko bezpieczne metody
        if permission == 'READ_ONLY':
            return request.method in permissions.SAFE_METHODS

        return False

    def _get_animal_id_from_request(self, request, view):
        """Helper do wyciągnięcia animal_id z różnych miejsc w request."""
        # Próbuj znaleźć animal_id w różnych miejscach
        if 'animal_id' in request.data:
            return request.data.get('animal_id')
        if 'animal' in request.data:
            return request.data.get('animal')
        if hasattr(view, 'kwargs') and 'animal_id' in view.kwargs:
            return view.kwargs.get('animal_id')
        return None


class IsOwnerOrCollaborator(AnimalResourcePermission):
    """
    Uprawnienie pozwalające na dostęp właścicielowi lub współpracownikom.

    - Właściciel ma pełny dostęp (CRUD)
    - Współpracownik z EDIT może modyfikować
    - Współpracownik z READ_ONLY może tylko czytać
    """
    owner_only = False
    allow_edit_create = False


class IsOwnerOnly(AnimalResourcePermission):
    """
    Uprawnienie pozwalające tylko właścicielowi.
    Używane dla operacji DELETE i zarządzania współpracą.
    """
    owner_only = True
    allow_edit_create = False


class CanAccessAnimal(AnimalResourcePermission):
    """
    Sprawdza czy użytkownik ma dostęp do zwierzęcia.
    Używane przy tworzeniu/odczycie zasobów powiązanych ze zwierzęciem.
    Współpracownicy z EDIT mogą tworzyć zasoby.
    """
    owner_only = False
    allow_edit_create = True


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Właściciel może modyfikować, inni tylko czytać.
    Używane dla słowników i danych referencyjnych.
    """

    def has_permission(self, request, view):
        """Sprawdź uprawnienia na poziomie widoku."""
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

    def has_object_permission(self, request, view, obj):
        """Sprawdź uprawnienia na poziomie obiektu."""
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsShoppingListOwner(permissions.BasePermission):
    """
    Uprawnienie dla list zakupów:
    - Użytkownik ma dostęp (odczyt i zapis) jeśli jest twórcą LUB ma dostęp do co najmniej jednej diety na liście
    - Współpracownicy mogą zaznaczać składniki jako kupione (is_checked)
    """

    def has_object_permission(self, request, view, obj):
        """
        Sprawdź czy użytkownik ma dostęp do listy zakupów lub jej pozycji.

        Logika:
        1. Dla ShoppingListItem: pobierz shopping_list z relacji
        2. Twórca ma pełny dostęp
        3. Właściciel/współpracownik zwierzęcia z jakiejkolwiek diety na liście ma pełny dostęp
        """
        from .models import ShoppingList, ShoppingListItem

        # Dla ShoppingListItem sprawdzamy shopping_list.created_by
        if isinstance(obj, ShoppingListItem):
            shopping_list = obj.shopping_list
        else:
            shopping_list = obj

        # Twórca ma pełny dostęp
        if shopping_list.created_by == request.user:
            return True

        # Optymalizacja: Sprawdź dostęp do diet na liście jednym zapytaniem
        # zamiast pętli po każdej diecie
        accessible_diets_exists = shopping_list.diets.filter(
            Q(animal__owner=request.user) |
            Q(animal__collaborations__user=request.user,
              animal__collaborations__is_active=True),
            is_active=True
        ).exists()

        return accessible_diets_exists


def has_access_to_animal(user, animal):
    """
    Helper function sprawdzający czy użytkownik ma dostęp do zwierzęcia.
    Wykorzystuje AnimalAccessMixin dla spójności z klasami uprawnień.

    Args:
        user: Obiekt użytkownika
        animal: Obiekt Animal

    Returns:
        dict z kluczami: 'has_access' (bool), 'is_owner' (bool), 'permission' (str|None)
    """
    mixin = AnimalAccessMixin()
    permission = mixin.get_user_permission_for_animal(user, animal)

    return {
        'has_access': permission is not None,
        'is_owner': permission == 'OWNER',
        'permission': permission
    }


def has_edit_permission(user, animal):
    """
    Helper function sprawdzający czy użytkownik może edytować zasoby zwierzęcia.

    Args:
        user: Obiekt użytkownika
        animal: Obiekt Animal

    Returns:
        bool
    """
    access_info = has_access_to_animal(user, animal)
    return access_info['has_access'] and access_info['permission'] in ['OWNER', 'EDIT']
