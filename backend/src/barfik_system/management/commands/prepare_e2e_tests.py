"""
Komenda Django do przygotowania bazy danych dla testów E2E Playwright.

Usage:
    python manage.py prepare_e2e_tests

Wykonuje:
1. Usuwa wszystkie dane użytkowników (users, animals, diets, shopping lists)
2. Zachowuje słowniki (AnimalType, Unit, IngredientCategory)
3. Wczytuje initial_data.json jeśli słowniki są puste
4. Tworzy testowego użytkownika e2e@test.pl
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.management import call_command
from barfik_system.models import (
    Animal, Diet, Ingredient, Collaboration, 
    ShoppingList, ShoppingListItem,
    AnimalType, Unit, IngredientCategory
)


class Command(BaseCommand):
    help = 'Przygotowuje bazę danych dla testów E2E (usuwa dane użytkowników, zachowuje słowniki)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-dictionaries',
            action='store_true',
            help='Pomiń sprawdzanie i ładowanie słowników',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🔄 Przygotowywanie bazy dla testów E2E...'))
        
        # 1. Sprawdź czy użytkownik testowy istnieje
        self.stdout.write('   ↳ Sprawdzanie użytkownika testowego e2e@test.pl...')
        
        try:
            test_user = User.objects.get(username='e2e@test.pl')
            self.stdout.write('   ✓ Użytkownik e2e@test.pl istnieje - czyszczenie danych...')
            
            # Usuń wszystkie dane tego użytkownika (zachowaj samego użytkownika)
            ShoppingListItem.all_objects.filter(shopping_list__created_by=test_user).delete()
            ShoppingList.all_objects.filter(created_by=test_user).delete()
            Collaboration.all_objects.filter(user=test_user).delete()
            
            # Usuń zwierzęta tego użytkownika (cascade usunie diety i składniki)
            Animal.all_objects.filter(owner=test_user).delete()
            
            self.stdout.write(self.style.SUCCESS('   ✓ Dane testowego użytkownika wyczyszczone'))
            
        except User.DoesNotExist:
            self.stdout.write('   → Użytkownik e2e@test.pl nie istnieje - tworzenie...')
            test_user = None
        
        # 2. Sprawdź słowniki i załaduj jeśli trzeba
        if not options['skip_dictionaries']:
            if not AnimalType.objects.exists() or not Unit.objects.exists() or not IngredientCategory.objects.exists():
                self.stdout.write('   ↳ Ładowanie słowników (initial_data.json)...')
                try:
                    call_command('loaddata', 'barfik_system/fixtures/initial_data.json', verbosity=0)
                    self.stdout.write(self.style.SUCCESS('   ✓ Słowniki załadowane'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'   ✗ Błąd ładowania słowników: {e}'))
                    return
            else:
                self.stdout.write(self.style.SUCCESS('   ✓ Słowniki już istnieją'))
        
        # 3. Utwórz testowego użytkownika jeśli nie istniał
        if test_user is None:
            self.stdout.write('   ↳ Tworzenie testowego użytkownika...')
            
            test_user = User.objects.create_user(
                username='e2e@test.pl',
                email='e2e@test.pl',
                password='TestPass123!',
                first_name='E2E',
                last_name='Test User'
            )
            
            self.stdout.write(self.style.SUCCESS(f'   ✓ Użytkownik utworzony: {test_user.email}'))
        
        # 4. Podsumowanie
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅ Baza przygotowana dla testów E2E'))
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('📋 Dane testowe:'))
        self.stdout.write(f'   Email:    e2e@test.pl')
        self.stdout.write(f'   Hasło:    TestPass123!')
        self.stdout.write('')
        self.stdout.write(f'   AnimalTypes:         {AnimalType.objects.count()}')
        self.stdout.write(f'   Units:               {Unit.objects.count()}')
        self.stdout.write(f'   IngredientCategories: {IngredientCategory.objects.count()}')
        self.stdout.write('')
