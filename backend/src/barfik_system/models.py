from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db.models import Q


# Mixiny i managery wspólne
class TimeStampedModel(models.Model):
    """Abstract model z polami created_at i updated_at."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ActiveManager(models.Manager):
    """Manager zwracający tylko aktywne rekordy (is_active=True)."""
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class SoftDeletableMixin(models.Model):
    """Mixin dodający soft delete z is_active oraz dwoma managerami."""
    is_active = models.BooleanField(default=True, db_index=True)
    
    objects = ActiveManager()  # domyślny manager - tylko aktywne
    all_objects = models.Manager()  # pełny dostęp do wszystkich rekordów

    class Meta:
        abstract = True


# Modele słownikowe
class AnimalType(TimeStampedModel):
    """Słownik gatunków zwierząt (pies, kot itp.)."""
    name = models.CharField(max_length=64, unique=True)

    class Meta:
        verbose_name = "Gatunek zwierzęcia"
        verbose_name_plural = "Gatunki zwierząt"
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name


class Unit(models.Model):
    """Słownik jednostek z konwersją do jednostki bazowej."""
    name = models.CharField(max_length=64, unique=True)
    symbol = models.CharField(max_length=16, unique=True)
    conversion_factor = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        validators=[MinValueValidator(0.000001)]
    )

    class Meta:
        verbose_name = "Jednostka"
        verbose_name_plural = "Jednostki"
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['symbol']),
        ]

    def __str__(self):
        return f"{self.name} ({self.symbol})"


class IngredientCategory(models.Model):
    """Słownik kategorii składników."""
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=64)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Kategoria składnika"
        verbose_name_plural = "Kategorie składników"
        indexes = [
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return self.name


# Modele główne
class Animal(TimeStampedModel, SoftDeletableMixin):
    """Profil zwierzęcia."""
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='animals'
    )
    species = models.ForeignKey(
        AnimalType,
        on_delete=models.PROTECT,
        related_name='animals'
    )
    name = models.CharField(max_length=64)
    date_of_birth = models.DateField(null=True, blank=True)
    weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True
    )
    note = models.TextField(blank=True)

    class Meta:
        verbose_name = "Zwierzę"
        verbose_name_plural = "Zwierzęta"
        indexes = [
            models.Index(fields=['owner', 'is_active']),
            models.Index(fields=['species', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.species.name})"


class Diet(TimeStampedModel, SoftDeletableMixin):
    """Dieta przypisana do zwierzęcia z zakresem dat."""
    animal = models.ForeignKey(
        Animal,
        on_delete=models.CASCADE,
        related_name='diets'
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    total_daily_mass = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0
    )
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Dieta"
        verbose_name_plural = "Diety"
        indexes = [
            models.Index(fields=['animal', 'is_active']),
            models.Index(fields=['animal', 'start_date', 'end_date']),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.end_date and self.start_date > self.end_date:
            raise ValidationError('Data rozpoczęcia nie może być późniejsza niż data zakończenia.')

    def __str__(self):
        end = self.end_date.strftime('%Y-%m-%d') if self.end_date else 'otwarta'
        return f"Dieta {self.animal.name} ({self.start_date.strftime('%Y-%m-%d')} - {end})"


class Ingredient(TimeStampedModel, SoftDeletableMixin):
    """Składnik diety (snapshot, nie słownik)."""
    COOKING_CHOICES = [
        ('raw', 'Surowe'),
        ('cooked', 'Gotowane'),
    ]

    diet = models.ForeignKey(
        Diet,
        on_delete=models.CASCADE,
        related_name='ingredients'
    )
    name = models.CharField(max_length=128)
    category = models.ForeignKey(
        IngredientCategory,
        on_delete=models.PROTECT,
        related_name='ingredients',
        null=True,
        blank=True
    )
    cooking_method = models.CharField(
        max_length=24,
        choices=COOKING_CHOICES
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        related_name='ingredients'
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0.001)]
    )
    amount_in_base_unit = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0
    )

    class Meta:
        verbose_name = "Składnik"
        verbose_name_plural = "Składniki"
        indexes = [
            models.Index(fields=['diet', 'is_active']),
            models.Index(fields=['category', 'is_active']),
        ]

    def save(self, *args, **kwargs):
        from decimal import Decimal
        amount_decimal = Decimal(str(self.amount))
        conversion_factor_decimal = Decimal(str(self.unit.conversion_factor))
        self.amount_in_base_unit = amount_decimal * conversion_factor_decimal
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.amount} {self.unit.symbol})"


class Collaboration(TimeStampedModel, SoftDeletableMixin):
    """Udostępnienie zwierzęcia innemu użytkownikowi."""
    PERMISSION_CHOICES = [
        ('READ_ONLY', 'Tylko odczyt'),
        ('EDIT', 'Edycja'),
    ]

    animal = models.ForeignKey(
        Animal,
        on_delete=models.CASCADE,
        related_name='collaborations'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='collaborations'
    )
    permission = models.CharField(
        max_length=16,
        choices=PERMISSION_CHOICES,
        default='EDIT'
    )

    class Meta:
        verbose_name = "Współpraca"
        verbose_name_plural = "Współprace"
        constraints = [
            models.UniqueConstraint(
                fields=['animal', 'user'],
                condition=Q(is_active=True),
                name='uix_collab_active_pair'
            )
        ]
        indexes = [
            models.Index(fields=['animal', 'user', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.animal.name} ({self.permission})"


class ShoppingList(TimeStampedModel, SoftDeletableMixin):
    """Lista zakupów generowana z diet."""
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shopping_lists'
    )
    diets = models.ManyToManyField(
        Diet,
        related_name='shopping_lists'
    )
    title = models.CharField(max_length=128, blank=True)
    days_count = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text='Liczba dni dla której generowana jest lista zakupów'
    )
    is_completed = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "Lista zakupów"
        verbose_name_plural = "Listy zakupów"
        indexes = [
            models.Index(fields=['created_by', 'is_active']),
            models.Index(fields=['is_completed', 'is_active']),
        ]

    def __str__(self):
        return self.title or f"Lista zakupów #{self.id}"


class ShoppingListItem(TimeStampedModel, SoftDeletableMixin):
    """Pozycja na liście zakupów (agregowana)."""
    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name='items'
    )
    ingredient_name = models.CharField(max_length=128)
    category = models.CharField(max_length=64, blank=True)
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        related_name='shopping_list_items'
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0.001)]
    )
    is_checked = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "Pozycja listy zakupów"
        verbose_name_plural = "Pozycje list zakupów"
        indexes = [
            models.Index(fields=['shopping_list', 'is_active']),
            models.Index(fields=['shopping_list', 'is_checked']),
        ]

    def __str__(self):
        return f"{self.ingredient_name} ({self.total_amount} {self.unit.symbol})"
