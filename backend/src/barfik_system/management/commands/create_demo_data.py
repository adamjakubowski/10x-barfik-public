"""Management command do tworzenia przykładowych danych testowych."""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from datetime import date, timedelta
from barfik_system.models import (
    AnimalType, Unit, IngredientCategory, Animal, Diet, Ingredient
)
from barfik_system import services


class Command(BaseCommand):
    help = 'Tworzy przykładowe dane testowe (użytkownik, zwierzę, dieta, składniki)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Usuń istniejące dane przed utworzeniem nowych',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING('Resetowanie danych...'))
            User.objects.filter(username='demo@barfik.pl').delete()
            self.stdout.write(self.style.SUCCESS('✓ Dane zresetowane'))

        self.stdout.write(self.style.SUCCESS('Tworzenie przykładowych danych...'))

        # Użytkownik demo
        user, created = User.objects.get_or_create(
            username='demo@barfik.pl',
            defaults={
                'email': 'demo@barfik.pl',
                'first_name': 'Jan',
                'last_name': 'Kowalski'
            }
        )
        if created:
            user.set_password('demo123')
            user.save()
            self.stdout.write(self.style.SUCCESS('✓ Utworzono użytkownika: demo@barfik.pl / demo123'))
        else:
            self.stdout.write(self.style.WARNING('⚠ Użytkownik demo@barfik.pl już istnieje'))

        # Pobierz słowniki
        dog_type = AnimalType.objects.get(name='Pies')
        gram = Unit.objects.get(symbol='g')
        kilogram = Unit.objects.get(symbol='kg')
        cat_meat = IngredientCategory.objects.get(code='meat')
        cat_veggies = IngredientCategory.objects.get(code='vegetables')
        cat_organs = IngredientCategory.objects.get(code='organs')

        # Zwierzę
        animal, created = Animal.objects.get_or_create(
            owner=user,
            name='Rex',
            defaults={
                'species': dog_type,
                'weight_kg': 25.5,
                'date_of_birth': date(2020, 5, 15),
                'note': 'Pies demonstracyjny - energiczny labrador'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Utworzono zwierzę: {animal.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Zwierzę {animal.name} już istnieje'))

        # Dieta
        start_date = date.today()
        end_date = start_date + timedelta(days=30)
        
        diet, created = Diet.objects.get_or_create(
            animal=animal,
            start_date=start_date,
            defaults={
                'end_date': end_date,
                'description': 'Dieta demonstracyjna - BARF standard'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Utworzono dietę: {diet.description}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Dieta już istnieje'))

        # Składniki
        ingredients_data = [
            {
                'name': 'Wołowina (kark)',
                'category': cat_meat,
                'cooking_method': 'raw',
                'unit': gram,
                'amount': 300
            },
            {
                'name': 'Kurczak (ćwiartka)',
                'category': cat_meat,
                'cooking_method': 'raw',
                'unit': gram,
                'amount': 200
            },
            {
                'name': 'Wątroba wołowa',
                'category': cat_organs,
                'cooking_method': 'raw',
                'unit': gram,
                'amount': 50
            },
            {
                'name': 'Marchewka',
                'category': cat_veggies,
                'cooking_method': 'cooked',
                'unit': gram,
                'amount': 100
            },
            {
                'name': 'Brokuł',
                'category': cat_veggies,
                'cooking_method': 'cooked',
                'unit': gram,
                'amount': 50
            },
        ]

        for ing_data in ingredients_data:
            ingredient, created = Ingredient.objects.get_or_create(
                diet=diet,
                name=ing_data['name'],
                defaults=ing_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Dodano składnik: {ingredient.name} ({ingredient.amount} {ingredient.unit.symbol})'))

        # Przelicz total
        services.recalculate_diet_total(diet.id)
        diet.refresh_from_db()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Przykładowe dane utworzone pomyślnie!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write(f'Login:    demo@barfik.pl')
        self.stdout.write(f'Hasło:    demo123')
        self.stdout.write('')
        self.stdout.write(f'Zwierzę:  {animal.name} ({animal.species.name}, {animal.weight_kg} kg)')
        self.stdout.write(f'Dieta:    {diet.start_date} - {diet.end_date}')
        self.stdout.write(f'Składniki: {diet.ingredients.filter(is_active=True).count()} pozycji')
        self.stdout.write(f'Całkowita masa dzienna: {diet.total_daily_mass} g')
        self.stdout.write('')
        self.stdout.write('Aby przetestować API:')
        self.stdout.write('  1. Uruchom serwer: python manage.py runserver')
        self.stdout.write('  2. Zaloguj się: POST /api/auth/login/')
        self.stdout.write('  3. Otwórz Swagger: http://127.0.0.1:8000/api/schema/swagger/')
        self.stdout.write('')
