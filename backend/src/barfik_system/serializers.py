"""Serializery DRF dla aplikacji Barfik."""
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
from .models import (
    AnimalType, Unit, IngredientCategory, Animal, Diet, 
    Ingredient, Collaboration, ShoppingList, ShoppingListItem
)


# User & Auth Serializers

class UserSerializer(serializers.ModelSerializer):
    """Serializer dla profilu użytkownika."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'username']
        read_only_fields = ['id']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer dla rejestracji nowego użytkownika."""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name']
    
    def validate_email(self, value):
        """Sprawdź czy email jest unikalny."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Użytkownik z tym adresem email już istnieje.')
        return value
    
    def create(self, validated_data):
        """Utwórz użytkownika z hasłem i emailem jako username."""
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user


# Dictionary Serializers

class AnimalTypeSerializer(serializers.ModelSerializer):
    """Serializer dla gatunków zwierząt."""
    
    class Meta:
        model = AnimalType
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UnitSerializer(serializers.ModelSerializer):
    """Serializer dla jednostek miar."""
    
    class Meta:
        model = Unit
        fields = ['id', 'name', 'symbol', 'conversion_factor']
        read_only_fields = ['id']


class IngredientCategorySerializer(serializers.ModelSerializer):
    """Serializer dla kategorii składników."""
    
    class Meta:
        model = IngredientCategory
        fields = ['id', 'code', 'name', 'description']
        read_only_fields = ['id']


# Main Model Serializers

class AnimalListSerializer(serializers.ModelSerializer):
    """Serializer dla listy zwierząt (uproszczony)."""
    species = AnimalTypeSerializer(read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    
    class Meta:
        model = Animal
        fields = [
            'id', 'owner', 'owner_email', 'species', 'name', 
            'date_of_birth', 'weight_kg', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']


class AnimalDetailSerializer(serializers.ModelSerializer):
    """Serializer dla szczegółów zwierzęcia."""
    species = AnimalTypeSerializer(read_only=True)
    species_id = serializers.PrimaryKeyRelatedField(
        queryset=AnimalType.objects.all(),
        source='species',
        write_only=True
    )
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    
    class Meta:
        model = Animal
        fields = [
            'id', 'owner', 'owner_email', 'species', 'species_id',
            'name', 'date_of_birth', 'weight_kg', 'note', 
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']
    
    def validate_weight_kg(self, value):
        """Walidacja wagi."""
        if value is not None and value <= 0:
            raise serializers.ValidationError('Waga musi być większa od 0.')
        return value


class AnimalCreateSerializer(serializers.ModelSerializer):
    """Serializer dla tworzenia zwierzęcia."""
    species_id = serializers.PrimaryKeyRelatedField(
        queryset=AnimalType.objects.all(),
        source='species'
    )
    
    class Meta:
        model = Animal
        fields = ['species_id', 'name', 'date_of_birth', 'weight_kg', 'note']


class CollaborationSerializer(serializers.ModelSerializer):
    """Serializer dla współpracy."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    animal_name = serializers.CharField(source='animal.name', read_only=True)
    
    class Meta:
        model = Collaboration
        fields = [
            'id', 'animal', 'animal_name', 'user', 'user_email',
            'permission', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'animal']
    
    def validate(self, attrs):
        """Walidacja - nie można dodać właściciela jako collaboratora."""
        animal = attrs.get('animal') or (self.instance.animal if self.instance else None)
        user = attrs.get('user')
        
        if user and animal and animal.owner == user:
            raise serializers.ValidationError({
                'user': 'Nie można dodać właściciela jako współpracownika.'
            })
        
        return attrs


class IngredientSerializer(serializers.ModelSerializer):
    """Serializer dla składników."""
    category = IngredientCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=IngredientCategory.objects.all(),
        source='category',
        required=False,
        allow_null=True
    )
    unit = UnitSerializer(read_only=True)
    unit_id = serializers.PrimaryKeyRelatedField(
        queryset=Unit.objects.all(),
        source='unit',
        write_only=True
    )
    
    class Meta:
        model = Ingredient
        fields = [
            'id', 'diet', 'name', 'category', 'category_id',
            'cooking_method', 'unit', 'unit_id', 'amount',
            'amount_in_base_unit', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'amount_in_base_unit', 
            'created_at', 'updated_at', 'diet'
        ]


class DietListSerializer(serializers.ModelSerializer):
    """Serializer dla listy diet (uproszczony)."""
    animal_name = serializers.CharField(source='animal.name', read_only=True)
    ingredients_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Diet
        fields = [
            'id', 'animal', 'animal_name', 'start_date', 'end_date',
            'total_daily_mass', 'description', 'ingredients_count',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'total_daily_mass', 
            'created_at', 'updated_at'
        ]
    
    def get_ingredients_count(self, obj):
        """Liczba aktywnych składników."""
        return obj.ingredients.filter(is_active=True).count()


class DietDetailSerializer(serializers.ModelSerializer):
    """Serializer dla szczegółów diety z listą składników."""
    animal_name = serializers.CharField(source='animal.name', read_only=True)
    ingredients = IngredientSerializer(many=True, read_only=True)
    
    class Meta:
        model = Diet
        fields = [
            'id', 'animal', 'animal_name', 'start_date', 'end_date',
            'total_daily_mass', 'description', 'ingredients',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'total_daily_mass', 
            'created_at', 'updated_at'
        ]
    
    def validate(self, attrs):
        """Walidacja zakresu dat."""
        start_date = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        end_date = attrs.get('end_date')
        
        if end_date and start_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'Data rozpoczęcia nie może być późniejsza niż data zakończenia.'
            })
        
        return attrs


class DietCreateSerializer(serializers.ModelSerializer):
    """Serializer dla tworzenia diety."""
    animal_id = serializers.PrimaryKeyRelatedField(
        queryset=Animal.objects.filter(is_active=True),
        source='animal'
    )
    
    class Meta:
        model = Diet
        fields = ['id', 'animal_id', 'start_date', 'end_date', 'description']
        read_only_fields = ['id']
    
    def validate(self, attrs):
        """Walidacja zakresu dat."""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if end_date and start_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'Data rozpoczęcia nie może być późniejsza niż data zakończenia.'
            })
        
        return attrs


class ShoppingListItemSerializer(serializers.ModelSerializer):
    """Serializer dla pozycji listy zakupów."""
    unit = UnitSerializer(read_only=True)
    
    class Meta:
        model = ShoppingListItem
        fields = [
            'id', 'ingredient_name', 'category', 'unit', 'total_amount',
            'is_checked', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ShoppingListSerializer(serializers.ModelSerializer):
    """Serializer dla listy zakupów."""
    items = ShoppingListItemSerializer(many=True, read_only=True)
    diets_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ShoppingList
        fields = [
            'id', 'created_by', 'title', 'days_count',
            'is_completed', 'diets', 'diets_info', 'items',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    @extend_schema_field({
        'type': 'array',
        'items': {
            'type': 'object',
            'properties': {
                'id': {'type': 'integer'},
                'animal_name': {'type': 'string'},
                'start_date': {'type': 'string', 'format': 'date'},
                'end_date': {'type': 'string', 'format': 'date', 'nullable': True}
            }
        }
    })
    def get_diets_info(self, obj):
        """Informacje o dietach na liście."""
        return [
            {
                'id': diet.id,
                'animal_name': diet.animal.name,
                'start_date': diet.start_date,
                'end_date': diet.end_date
            }
            for diet in obj.diets.filter(is_active=True)
        ]
    
    def validate_days_count(self, value):
        """Walidacja liczby dni."""
        if value < 1:
            raise serializers.ValidationError('Liczba dni musi być większa od 0.')
        return value


class ShoppingListCreateSerializer(serializers.ModelSerializer):
    """Serializer dla tworzenia listy zakupów."""
    diets = serializers.PrimaryKeyRelatedField(
        queryset=Diet.objects.filter(is_active=True),
        many=True
    )
    
    class Meta:
        model = ShoppingList
        fields = ['title', 'diets', 'days_count']
    
    def validate_diets(self, value):
        """Walidacja - musi być co najmniej jedna dieta."""
        if not value:
            raise serializers.ValidationError('Musisz wybrać co najmniej jedną dietę.')
        return value
    
    def validate_days_count(self, value):
        """Walidacja liczby dni."""
        if value < 1:
            raise serializers.ValidationError('Liczba dni musi być większa od 0.')
        return value


# Dashboard Serializers

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer dla statystyk dashboardu."""
    animals_count = serializers.IntegerField(help_text='Liczba aktywnych zwierząt')
    active_diets_count = serializers.IntegerField(help_text='Liczba aktywnych diet')
    expiring_diets_count = serializers.IntegerField(help_text='Liczba diet wygasających w ciągu 7 dni')
    active_shopping_lists_count = serializers.IntegerField(help_text='Liczba aktywnych list zakupów')
    completed_shopping_lists_count = serializers.IntegerField(help_text='Liczba ukończonych list w bieżącym miesiącu')


class AnimalWithoutDietAlertSerializer(serializers.Serializer):
    """Serializer dla alertu o zwierzęciu bez diety."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    species = serializers.CharField()


class ExpiringDietAlertSerializer(serializers.Serializer):
    """Serializer dla alertu o wygasającej diecie."""
    id = serializers.IntegerField()
    animal_id = serializers.IntegerField()
    animal_name = serializers.CharField()
    end_date = serializers.DateField()
    days_left = serializers.IntegerField()


class OldShoppingListAlertSerializer(serializers.Serializer):
    """Serializer dla alertu o starej liście zakupów."""
    id = serializers.IntegerField()
    title = serializers.CharField()
    created_at = serializers.DateTimeField()
    days_old = serializers.IntegerField()


class DashboardAlertsSerializer(serializers.Serializer):
    """Serializer dla alertów dashboardu."""
    animals_without_diet = AnimalWithoutDietAlertSerializer(many=True)
    expiring_diets = ExpiringDietAlertSerializer(many=True)
    old_shopping_lists = OldShoppingListAlertSerializer(many=True)


class DashboardSerializer(serializers.Serializer):
    """Główny serializer dla dashboardu."""
    stats = DashboardStatsSerializer()
    alerts = DashboardAlertsSerializer()
