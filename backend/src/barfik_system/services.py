"""Warstwa serwisowa dla logiki biznesowej Barfik."""
from decimal import Decimal
from typing import List, Dict
from django.db import transaction
from django.db.models import Sum, Q
from .models import (
    Diet, Ingredient, ShoppingList, ShoppingListItem, 
    Collaboration, Animal, Unit
)


def recalculate_diet_total(diet_id: int) -> Decimal:
    """
    Przelicz total_daily_mass dla diety na podstawie składników.
    
    Args:
        diet_id: ID diety do przeliczenia
    
    Returns:
        Decimal: Nowa wartość total_daily_mass
    """
    try:
        diet = Diet.objects.get(id=diet_id)
        
        # Suma amount_in_base_unit wszystkich aktywnych składników
        total = Ingredient.objects.filter(
            diet=diet,
            is_active=True
        ).aggregate(
            total=Sum('amount_in_base_unit')
        )['total'] or Decimal('0')
        
        # Aktualizuj dietę
        diet.total_daily_mass = total
        diet.save(update_fields=['total_daily_mass', 'updated_at'])
        
        return total
    except Diet.DoesNotExist:
        return Decimal('0')


def create_ingredient(diet_id: int, **ingredient_data) -> Ingredient:
    """
    Utwórz składnik i zaktualizuj total_daily_mass diety.
    
    Args:
        diet_id: ID diety
        **ingredient_data: Dane składnika
    
    Returns:
        Ingredient: Utworzony składnik
    """
    with transaction.atomic():
        diet = Diet.objects.select_for_update().get(id=diet_id)
        
        ingredient = Ingredient.objects.create(
            diet=diet,
            **ingredient_data
        )
        
        # Przelicz total dla diety
        recalculate_diet_total(diet_id)
        
        return ingredient


def update_ingredient(ingredient_id: int, **update_data) -> Ingredient:
    """
    Zaktualizuj składnik i przelicz total_daily_mass diety.
    
    Args:
        ingredient_id: ID składnika
        **update_data: Dane do aktualizacji
    
    Returns:
        Ingredient: Zaktualizowany składnik
    """
    with transaction.atomic():
        ingredient = Ingredient.objects.select_related('diet').get(id=ingredient_id)
        
        for key, value in update_data.items():
            setattr(ingredient, key, value)
        
        ingredient.save()
        
        # Przelicz total dla diety
        recalculate_diet_total(ingredient.diet.id)
        
        return ingredient


def delete_ingredient(ingredient_id: int) -> bool:
    """
    Soft delete składnika i przelicz total_daily_mass diety.
    
    Args:
        ingredient_id: ID składnika
    
    Returns:
        bool: True jeśli udało się usunąć
    """
    with transaction.atomic():
        try:
            ingredient = Ingredient.objects.select_related('diet').get(id=ingredient_id)
            diet_id = ingredient.diet.id
            
            ingredient.is_active = False
            ingredient.save(update_fields=['is_active', 'updated_at'])
            
            # Przelicz total dla diety
            recalculate_diet_total(diet_id)
            
            return True
        except Ingredient.DoesNotExist:
            return False


@transaction.atomic
def generate_shopping_list(
    user,
    diet_ids: List[int],
    days_count: int,
    title: str = ''
) -> ShoppingList:
    """
    Wygeneruj listę zakupów z wybranych diet.
    
    Logika:
    1. Zbierz wszystkie aktywne składniki z wybranych diet
    2. Pomnóż amount_in_base_unit przez days_count
    3. Agreguj po ingredient_name (case-insensitive, normalized)
    4. Utwórz ShoppingList i ShoppingListItem
    
    Args:
        user: Użytkownik tworzący listę
        diet_ids: Lista ID diet
        days_count: Liczba dni
        title: Tytuł listy (opcjonalny)
    
    Returns:
        ShoppingList: Utworzona lista zakupów
    """
    # Pobierz diety
    diets = Diet.objects.filter(
        id__in=diet_ids,
        is_active=True
    ).prefetch_related('ingredients')
    
    if not diets.exists():
        raise ValueError('Nie znaleziono aktywnych diet.')
    
    # Zbierz składniki z wszystkich diet
    ingredients = Ingredient.objects.filter(
        diet__in=diets,
        is_active=True
    ).select_related('unit', 'category')
    
    # Agreguj składniki po nazwie (case-insensitive)
    aggregated = {}
    
    for ingredient in ingredients:
        # Normalizacja nazwy (lowercase, trim)
        normalized_name = ingredient.name.strip().lower()
        
        if normalized_name not in aggregated:
            aggregated[normalized_name] = {
                'name': ingredient.name,  # Zachowaj oryginalną nazwę pierwszego wystąpienia
                'category': ingredient.category.name if ingredient.category else '',  # Kopia nazwy kategorii
                'unit': ingredient.unit,
                'total_amount': Decimal('0')
            }
        
        # Dodaj amount pomnożony przez days_count
        aggregated[normalized_name]['total_amount'] += (
            ingredient.amount_in_base_unit * days_count
        )
    
    # Utwórz ShoppingList
    shopping_list = ShoppingList.objects.create(
        created_by=user,
        title=title or f'Lista zakupów ({days_count} dni)',
        days_count=days_count,
        is_completed=False
    )
    
    # Dodaj diety do M2M
    shopping_list.diets.set(diets)
    
    # Utwórz ShoppingListItem dla każdego zagregowanego składnika
    items = []
    for data in aggregated.values():
        items.append(
            ShoppingListItem(
                shopping_list=shopping_list,
                ingredient_name=data['name'],
                category=data['category'],
                unit=data['unit'],
                total_amount=data['total_amount'],
                is_checked=False
            )
        )
    
    # Bulk create dla wydajności
    ShoppingListItem.objects.bulk_create(items)
    
    return shopping_list


@transaction.atomic
def regenerate_shopping_list(shopping_list_id: int) -> ShoppingList:
    """
    Przelicz listę zakupów po zmianie diet lub days_count.
    
    Args:
        shopping_list_id: ID listy zakupów
    
    Returns:
        ShoppingList: Zaktualizowana lista
    """
    shopping_list = ShoppingList.objects.prefetch_related(
        'diets', 'items'
    ).get(id=shopping_list_id)
    
    # Usuń stare pozycje (soft delete)
    shopping_list.items.update(is_active=False)
    
    # Wygeneruj nowe pozycje
    diets = shopping_list.diets.filter(is_active=True)
    days_count = shopping_list.days_count
    
    # Zbierz składniki
    ingredients = Ingredient.objects.filter(
        diet__in=diets,
        is_active=True
    ).select_related('unit', 'category')
    
    # Agreguj
    aggregated = {}
    for ingredient in ingredients:
        normalized_name = ingredient.name.strip().lower()
        
        if normalized_name not in aggregated:
            aggregated[normalized_name] = {
                'name': ingredient.name,
                'category': ingredient.category.name if ingredient.category else '',
                'unit': ingredient.unit,
                'total_amount': Decimal('0')
            }
        
        aggregated[normalized_name]['total_amount'] += (
            ingredient.amount_in_base_unit * days_count
        )
    
    # Utwórz nowe pozycje
    items = []
    for data in aggregated.values():
        items.append(
            ShoppingListItem(
                shopping_list=shopping_list,
                ingredient_name=data['name'],
                category=data['category'],
                unit=data['unit'],
                total_amount=data['total_amount'],
                is_checked=False
            )
        )
    
    ShoppingListItem.objects.bulk_create(items)
    
    # Odznacz is_completed jeśli była zaznaczona
    if shopping_list.is_completed:
        shopping_list.is_completed = False
        shopping_list.save(update_fields=['is_completed', 'updated_at'])
    
    return shopping_list


def get_accessible_animals(user) -> Q:
    """
    Zwróć Q object filtrujący zwierzęta dostępne dla użytkownika.
    
    Args:
        user: Obiekt użytkownika
    
    Returns:
        Q: Django Q object dla filtrowania
    """
    return Q(owner=user) | Q(
        collaborations__user=user,
        collaborations__is_active=True
    )


def get_accessible_diets(user) -> Q:
    """
    Zwróć Q object filtrujący diety dostępne dla użytkownika.
    
    Args:
        user: Obiekt użytkownika
    
    Returns:
        Q: Django Q object dla filtrowania
    """
    return Q(animal__owner=user) | Q(
        animal__collaborations__user=user,
        animal__collaborations__is_active=True
    )


def validate_collaboration(animal: Animal, user) -> Dict:
    """
    Waliduj możliwość dodania współpracy.
    
    Args:
        animal: Obiekt Animal
        user: Użytkownik do dodania
    
    Returns:
        dict: {'valid': bool, 'error': str|None}
    """
    # Nie można dodać właściciela
    if animal.owner == user:
        return {
            'valid': False,
            'error': 'Nie można dodać właściciela jako współpracownika.'
        }
    
    # Sprawdź czy już istnieje aktywna współpraca
    if Collaboration.objects.filter(
        animal=animal,
        user=user,
        is_active=True
    ).exists():
        return {
            'valid': False,
            'error': 'Ten użytkownik już ma aktywną współpracę z tym zwierzęciem.'
        }
    
    return {'valid': True, 'error': None}


def create_collaboration(animal: Animal, user, permission: str = 'READ_ONLY') -> Collaboration:
    """
    Utwórz współpracę po walidacji.
    
    Args:
        animal: Obiekt Animal
        user: Użytkownik
        permission: Poziom uprawnień (READ_ONLY|EDIT)
    
    Returns:
        Collaboration: Utworzona współpraca
    
    Raises:
        ValueError: Jeśli walidacja nie przejdzie
    """
    validation = validate_collaboration(animal, user)
    if not validation['valid']:
        raise ValueError(validation['error'])
    
    collaboration = Collaboration.objects.create(
        animal=animal,
        user=user,
        permission=permission
    )
    
    return collaboration


def get_dashboard_stats(user) -> Dict:
    """
    Pobierz statystyki dla dashboardu użytkownika.
    
    Args:
        user: Obiekt użytkownika
    
    Returns:
        dict: Słownik ze statystykami, szybkimi akcjami i alertami
    """
    from datetime import date, timedelta
    from django.db.models import Count
    
    today = date.today()
    week_from_now = today + timedelta(days=7)
    
    # Filtr dla dostępnych zwierząt
    animals_filter = get_accessible_animals(user)
    
    # Filtr dla dostępnych diet
    diets_filter = get_accessible_diets(user)
    
    # 1. Statystyki
    stats = {
        # Liczba aktywnych zwierząt
        'animals_count': Animal.objects.filter(
            animals_filter,
            is_active=True
        ).distinct().count(),
        
        # Liczba aktywnych diet (obowiązujących dziś)
        'active_diets_count': Diet.objects.filter(
            diets_filter,
            is_active=True,
            start_date__lte=today
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=today)
        ).distinct().count(),
        
        # Liczba diet wygasających w ciągu 7 dni
        'expiring_diets_count': Diet.objects.filter(
            diets_filter,
            is_active=True,
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=week_from_now
        ).distinct().count(),
        
        # Liczba aktywnych list zakupów
        'active_shopping_lists_count': ShoppingList.objects.filter(
            Q(created_by=user) | Q(diets__animal__owner=user) | Q(
                diets__animal__collaborations__user=user,
                diets__animal__collaborations__is_active=True
            ),
            is_active=True,
            is_completed=False
        ).distinct().count(),
        
        # Liczba ukończonych list zakupów w bieżącym miesiącu
        'completed_shopping_lists_count': ShoppingList.objects.filter(
            Q(created_by=user) | Q(diets__animal__owner=user) | Q(
                diets__animal__collaborations__user=user,
                diets__animal__collaborations__is_active=True
            ),
            is_active=True,
            is_completed=True,
            updated_at__year=today.year,
            updated_at__month=today.month
        ).distinct().count(),
    }
    
    # 2. Alerty - Zwierzęta bez aktywnej diety
    animals_without_diet = []
    all_animals = Animal.objects.filter(
        animals_filter,
        is_active=True
    ).distinct()
    
    for animal in all_animals:
        has_active_diet = Diet.objects.filter(
            animal=animal,
            is_active=True,
            start_date__lte=today
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=today)
        ).exists()
        
        if not has_active_diet:
            animals_without_diet.append({
                'id': animal.id,
                'name': animal.name,
                'species': animal.species.name
            })
    
    # 3. Alerty - Diety wygasające w ciągu 7 dni
    expiring_diets = []
    expiring_diets_qs = Diet.objects.filter(
        diets_filter,
        is_active=True,
        end_date__isnull=False,
        end_date__gte=today,
        end_date__lte=week_from_now
    ).select_related('animal', 'animal__species').distinct()
    
    for diet in expiring_diets_qs:
        days_left = (diet.end_date - today).days
        expiring_diets.append({
            'id': diet.id,
            'animal_id': diet.animal.id,
            'animal_name': diet.animal.name,
            'end_date': diet.end_date.isoformat(),
            'days_left': days_left
        })
    
    # 4. Alerty - Niekompletne listy zakupów starsze niż 7 dni
    week_ago = today - timedelta(days=7)
    old_shopping_lists = []
    old_lists_qs = ShoppingList.objects.filter(
        Q(created_by=user) | Q(diets__animal__owner=user) | Q(
            diets__animal__collaborations__user=user,
            diets__animal__collaborations__is_active=True
        ),
        is_active=True,
        is_completed=False,
        created_at__date__lte=week_ago
    ).distinct()
    
    for shopping_list in old_lists_qs:
        days_old = (today - shopping_list.created_at.date()).days
        old_shopping_lists.append({
            'id': shopping_list.id,
            'title': shopping_list.title,
            'created_at': shopping_list.created_at.isoformat(),
            'days_old': days_old
        })
    
    return {
        'stats': stats,
        'alerts': {
            'animals_without_diet': animals_without_diet,
            'expiring_diets': expiring_diets,
            'old_shopping_lists': old_shopping_lists
        }
    }
