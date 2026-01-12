# Backend Implementation Patterns - Django

Szczegółowe wzorce implementacyjne dla backendu Barfik. Ten dokument uzupełnia [copilot-instructions.md](../.github/copilot-instructions.md) o głębsze przykłady kodu.

## Spis treści

- [Service Layer Architecture](#service-layer-architecture)
- [Selectors Pattern](#selectors-pattern)
- [Soft Delete Pattern](#soft-delete-pattern)
- [Auto-calculated Fields & Signals](#auto-calculated-fields--signals)
- [Permissions & Access Control](#permissions--access-control)
- [Model-Specific Validation](#model-specific-validation)

---

## Service Layer Architecture

### Zasada fundamentalna

**Logika biznesowa NIE należy do widoków ani modeli.**

Struktura projektu:
- `models.py` - tylko definicje modeli, relacje, podstawowe walidacje
- `services.py` - **TUTAJ** cała logika biznesowa, mutacje, kalkulacje
- `selectors.py` - złożone zapytania read-only z optymalizacjami
- `views.py` - cienka warstwa wywołująca services/selectors

### Przykład: Generowanie listy zakupów

❌ **ŹLE** - logika w widoku:
```python
# views.py - NIE TAK!
class ShoppingListViewSet(viewsets.ModelViewSet):
    def create(self, request):
        diets = Diet.objects.filter(id__in=request.data['diet_ids'])
        ingredients = Ingredient.objects.filter(diet__in=diets, is_active=True)
        # 50 linii agregacji, mnożenia, sumowania...
        shopping_list = ShoppingList.objects.create(...)
        return Response(serializer.data)
```

✅ **DOBRZE** - logika w serwisie:
```python
# services.py
def generate_shopping_list(
    user: User,
    diet_ids: list[int],
    days_count: int,
    title: str = ""
) -> ShoppingList:
    """
    Generuje listę zakupów z wielu diet.

    Proces:
    1. Waliduje dostęp użytkownika do diet
    2. Zbiera składniki z aktywnych diet
    3. Agreguje po nazwie składnika (surowe+gotowane razem)
    4. Mnoży przez days_count
    5. Tworzy ShoppingList + ShoppingListItem
    """
    # Walidacja dostępu
    accessible_diets = selectors.get_user_accessible_diets(
        user=user,
        diet_ids=diet_ids
    )

    # Pobranie składników z optymalizacją
    ingredients = Ingredient.objects.filter(
        diet__in=accessible_diets,
        is_active=True
    ).select_related('unit', 'category')

    # Agregacja po nazwie (case-insensitive)
    aggregated = {}
    for ing in ingredients:
        name_key = ing.name.lower().strip()
        if name_key not in aggregated:
            aggregated[name_key] = {
                'name': ing.name,
                'unit': ing.unit,
                'category': ing.category,
                'total_base_amount': Decimal('0')
            }
        aggregated[name_key]['total_base_amount'] += ing.amount_in_base_unit

    # Utworzenie listy
    with transaction.atomic():
        shopping_list = ShoppingList.objects.create(
            created_by=user,
            title=title or f"Zakupy na {days_count} dni",
            days_count=days_count
        )
        shopping_list.diets.set(accessible_diets)

        # Utworzenie pozycji
        items = []
        for data in aggregated.values():
            items.append(ShoppingListItem(
                shopping_list=shopping_list,
                ingredient_name=data['name'],
                unit=data['unit'],
                total_amount=data['total_base_amount'] * days_count,
                category=data['category']
            ))
        ShoppingListItem.objects.bulk_create(items)

    return shopping_list


# views.py - cienka warstwa
class ShoppingListViewSet(viewsets.ModelViewSet):
    def create(self, request):
        shopping_list = services.generate_shopping_list(
            user=request.user,
            diet_ids=request.data['diets'],
            days_count=request.data['days_count'],
            title=request.data.get('title', '')
        )
        serializer = self.get_serializer(shopping_list)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

### Kiedy tworzyć nowy serwis?

- Operacja wymaga walidacji biznesowej (nie tylko Django validators)
- Operacja modyfikuje wiele modeli naraz (transakcja)
- Operacja zawiera kalkulacje/agregacje
- Logika będzie używana w więcej niż jednym miejscu
- Operacja może być testowana jednostkowo

---

## Selectors Pattern

### Cel

Złożone zapytania read-only z optymalizacjami, bez logiki mutacji.

### Przykład: Dashboard statistics

```python
# selectors.py
from django.db.models import Q, Count, Prefetch
from datetime import date, timedelta


def get_user_accessible_animals(user: User) -> QuerySet[Animal]:
    """
    Zwraca zwierzęta dostępne dla użytkownika:
    - Właściciel (Animal.owner)
    - Aktywna współpraca (Collaboration)
    """
    return Animal.objects.filter(
        Q(owner=user) | Q(
            collaborations__user=user,
            collaborations__is_active=True
        ),
        is_active=True
    ).select_related('species', 'owner').distinct()


def get_dashboard_stats(user: User) -> dict:
    """
    Statystyki dla dashboardu (FR.1.1 z PRD).

    Optymalizacja: wszystkie agregacje w jednym query z prefetch.
    """
    animals = get_user_accessible_animals(user)

    today = date.today()
    week_ahead = today + timedelta(days=7)

    # Prefetch aktywnych diet z filtrem wygasających
    active_diets_prefetch = Prefetch(
        'diets',
        queryset=Diet.objects.filter(is_active=True),
        to_attr='active_diets_list'
    )

    expiring_diets_prefetch = Prefetch(
        'diets',
        queryset=Diet.objects.filter(
            is_active=True,
            end_date__gte=today,
            end_date__lte=week_ahead
        ),
        to_attr='expiring_diets_list'
    )

    animals_with_diets = animals.prefetch_related(
        active_diets_prefetch,
        expiring_diets_prefetch
    )

    # Agregacja
    total_animals = len(animals_with_diets)
    total_active_diets = sum(len(a.active_diets_list) for a in animals_with_diets)
    expiring_diets = sum(len(a.expiring_diets_list) for a in animals_with_diets)

    # Listy zakupów
    shopping_lists = ShoppingList.objects.filter(
        Q(created_by=user) | Q(diets__animal__in=animals),
        is_active=True
    ).distinct()

    active_shopping_lists = shopping_lists.filter(is_completed=False).count()
    completed_shopping_lists = shopping_lists.filter(is_completed=True).count()

    return {
        'total_animals': total_animals,
        'total_active_diets': total_active_diets,
        'expiring_diets_count': expiring_diets,
        'active_shopping_lists': active_shopping_lists,
        'completed_shopping_lists': completed_shopping_lists
    }


def get_animals_needing_attention(user: User) -> dict:
    """
    Lista "wymagające uwagi" dla dashboardu (FR.1.3).
    """
    animals = get_user_accessible_animals(user).prefetch_related(
        Prefetch(
            'diets',
            queryset=Diet.objects.filter(is_active=True),
            to_attr='active_diets_list'
        )
    )

    today = date.today()
    week_ahead = today + timedelta(days=7)
    week_ago = today - timedelta(days=7)

    # Zwierzęta bez aktywnej diety
    animals_without_diet = [
        a for a in animals if len(a.active_diets_list) == 0
    ]

    # Diety kończące się w ciągu 7 dni
    expiring_diets = Diet.objects.filter(
        animal__in=animals,
        is_active=True,
        end_date__gte=today,
        end_date__lte=week_ahead
    ).select_related('animal')

    # Niekompletne listy starsze niż 7 dni
    old_incomplete_lists = ShoppingList.objects.filter(
        Q(created_by=user) | Q(diets__animal__in=animals),
        is_active=True,
        is_completed=False,
        created_at__lt=week_ago
    ).distinct()

    return {
        'animals_without_diet': animals_without_diet,
        'expiring_diets': expiring_diets,
        'old_incomplete_shopping_lists': old_incomplete_lists
    }
```

### Zasady selectors

- Tylko operacje read-only (żadnych `.create()`, `.update()`, `.delete()`)
- Zawsze używaj `select_related` dla FK
- Zawsze używaj `prefetch_related` dla M2M i reverse FK
- Zwracaj QuerySet tam gdzie możliwe (lazy evaluation)
- Dokumentuj optymalizacje w docstringu

---

## Soft Delete Pattern

### Implementacja

Wszystkie główne modele dziedziczą z `SoftDeletableMixin`:

```python
# models.py
from django.db import models


class ActiveManager(models.Manager):
    """Manager zwracający tylko aktywne rekordy."""
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class SoftDeletableMixin(models.Model):
    """
    Mixin dla soft delete.

    Usage:
        Model.objects.all()  # tylko aktywne (is_active=True)
        Model.all_objects.all()  # wszystkie rekordy
    """
    is_active = models.BooleanField(default=True, db_index=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Override delete() aby wykonać soft delete."""
        self.is_active = False
        self.save(using=using)

    def hard_delete(self):
        """Fizyczne usunięcie z bazy (używać z ostrożnością!)"""
        super().delete()

    def restore(self):
        """Przywrócenie usuniętego rekordu."""
        self.is_active = True
        self.save()


# Modele z soft delete
class Animal(SoftDeletableMixin, TimeStampedModel):
    # ...
    pass

class Diet(SoftDeletableMixin, TimeStampedModel):
    # ...
    pass
```

### Przykłady użycia

```python
# Domyślnie - tylko aktywne
animals = Animal.objects.all()  # is_active=True

# Wszystkie (w tym usunięte)
all_animals = Animal.all_objects.all()

# Usunięcie (soft)
animal = Animal.objects.get(id=1)
animal.delete()  # is_active=False

# Przywrócenie
animal.restore()  # is_active=True

# Fizyczne usunięcie (rzadko używane)
animal.hard_delete()  # usunięcie z bazy
```

### Zasady soft delete

- **Domyślnie używaj `Model.objects`** - filtruje aktywne
- **Audyt wymaga `Model.all_objects`**
- **Relacje CASCADE respektują soft delete** - dodaj logikę w `delete()`
- **W selectorach zawsze filtruj `is_active=True`** jawnie przy JOINach

---

## Auto-calculated Fields & Signals

### Pola przeliczane automatycznie

#### 1. Ingredient.amount_in_base_unit

Przeliczane w `save()` z `amount * unit.conversion_factor`:

```python
# models.py
class Ingredient(SoftDeletableMixin, TimeStampedModel):
    amount = models.DecimalField(max_digits=12, decimal_places=3)
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT)
    amount_in_base_unit = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        editable=False  # Nigdy nie modyfikuj ręcznie!
    )

    def save(self, *args, **kwargs):
        # Auto-kalkulacja przed zapisem
        if self.unit_id:
            self.amount_in_base_unit = self.amount * self.unit.conversion_factor
        super().save(*args, **kwargs)
```

#### 2. Diet.total_daily_mass

Aktualizowane przez signals po zmianach składników:

```python
# services.py (nie models.py!)
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from decimal import Decimal


def recalculate_diet_total_mass(diet: Diet) -> None:
    """
    Przelicza total_daily_mass dla diety.
    Sumuje amount_in_base_unit wszystkich aktywnych składników.
    """
    total = Ingredient.objects.filter(
        diet=diet,
        is_active=True
    ).aggregate(
        total=models.Sum('amount_in_base_unit')
    )['total'] or Decimal('0')

    Diet.objects.filter(id=diet.id).update(total_daily_mass=total)


@receiver(post_save, sender=Ingredient)
def ingredient_saved(sender, instance, **kwargs):
    """Po zapisie składnika - przelicz masę diety."""
    recalculate_diet_total_mass(instance.diet)


@receiver(post_delete, sender=Ingredient)
def ingredient_deleted(sender, instance, **kwargs):
    """Po usunięciu składnika - przelicz masę diety."""
    recalculate_diet_total_mass(instance.diet)


# WAŻNE: Zarejestruj signals w apps.py
class BarfikSystemConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'barfik_system'

    def ready(self):
        import barfik_system.services  # Importuj signals
```

### Zasady auto-fields

- **NIE modyfikuj ich ręcznie** w widokach ani serializerach
- **Signals w `services.py`**, nie w `models.py` (separacja logiki)
- **Używaj `update()` zamiast `save()`** w signals (unikaj rekursji)
- **Zawsze dodaj `editable=False`** w definicji pola

---

## Permissions & Access Control

### Model uprawnień

```python
# permissions.py
from rest_framework import permissions
from barfik_system.models import Collaboration


class IsOwnerOrCollaborator(permissions.BasePermission):
    """
    Dostęp do zasobu jeśli:
    - Użytkownik jest właścicielem zwierzęcia
    - Użytkownik ma aktywną współpracę
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Określ zwierzę (różne modele)
        if hasattr(obj, 'owner'):
            animal = obj  # Animal
        elif hasattr(obj, 'animal'):
            animal = obj.animal  # Diet, Collaboration
        else:
            return False

        # Właściciel ma pełny dostęp
        if animal.owner == user:
            return True

        # Sprawdź współpracę
        collaboration = Collaboration.objects.filter(
            animal=animal,
            user=user,
            is_active=True
        ).first()

        if not collaboration:
            return False

        # READ_ONLY: tylko GET/HEAD/OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True

        # EDIT: wszystkie metody
        return collaboration.permission == 'EDIT'


class IsShoppingListAccessible(permissions.BasePermission):
    """
    Dostęp do listy zakupów (FR.5.4):
    - Twórca listy
    - Użytkownik ma dostęp do co najmniej jednej diety z listy
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        shopping_list = obj

        # Twórca
        if shopping_list.created_by == user:
            return True

        # Sprawdź dostęp do diet na liście
        for diet in shopping_list.diets.all():
            animal = diet.animal

            # Właściciel zwierzęcia
            if animal.owner == user:
                return True

            # Współpracownik
            has_collaboration = Collaboration.objects.filter(
                animal=animal,
                user=user,
                is_active=True
            ).exists()

            if has_collaboration:
                return True

        return False
```

### Użycie w widokach

```python
# views.py
class AnimalViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrCollaborator]

    def get_queryset(self):
        # KRYTYCZNE: filtruj tylko dostępne zasoby
        return selectors.get_user_accessible_animals(self.request.user)


class ShoppingListViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsShoppingListAccessible]

    def get_queryset(self):
        user = self.request.user
        animals = selectors.get_user_accessible_animals(user)

        return ShoppingList.objects.filter(
            Q(created_by=user) | Q(diets__animal__in=animals),
            is_active=True
        ).distinct()
```

---

## Model-Specific Validation

### Diet validation

```python
# models.py
class Diet(SoftDeletableMixin, TimeStampedModel):
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    def clean(self):
        """Walidacja Django (nie walidacja biznesowa!)"""
        super().clean()

        if self.end_date and self.start_date > self.end_date:
            raise ValidationError({
                'end_date': 'Data końca nie może być wcześniejsza niż data startu.'
            })

    def save(self, *args, **kwargs):
        self.full_clean()  # Wymuś clean() przed zapisem
        super().save(*args, **kwargs)
```

### Collaboration unique constraint

```python
# models.py
class Collaboration(SoftDeletableMixin, TimeStampedModel):
    animal = models.ForeignKey(Animal, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    permission = models.CharField(
        max_length=16,
        choices=[('READ_ONLY', 'Read Only'), ('EDIT', 'Edit')],
        default='READ_ONLY'
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['animal', 'user'],
                condition=models.Q(is_active=True),
                name='uix_collab_active_pair'
            )
        ]

    def clean(self):
        super().clean()

        # Właściciel nie może być współpracownikiem
        if self.animal.owner == self.user:
            raise ValidationError(
                'Właściciel zwierzęcia nie może być dodany jako współpracownik.'
            )
```

### Obsługa IntegrityError w widokach

```python
# views.py
from django.db import IntegrityError

class CollaborationViewSet(viewsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError as e:
            if 'uix_collab_active_pair' in str(e):
                return Response(
                    {'detail': 'Aktywna współpraca dla tego użytkownika już istnieje.'},
                    status=status.HTTP_409_CONFLICT
                )
            raise
```

---

## Podsumowanie: Dobre praktyki

### ✅ DO:
- Logika biznesowa → `services.py`
- Złożone query → `selectors.py` z optymalizacjami
- Signals → `services.py` (nie `models.py`)
- Domyślnie używaj `Model.objects` (aktywne rekordy)
- Permissions w klasach + filtracja w `get_queryset()`

### ❌ NIE:
- Logika biznesowa w widokach
- Modyfikacja auto-calculated fields ręcznie
- Signals w `models.py`
- Zapominanie o `select_related`/`prefetch_related`
- Poleganie tylko na permissions bez filtracji queryset
