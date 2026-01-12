from django.contrib import admin
from .models import (
    AnimalType,
    Unit,
    IngredientCategory,
    Animal,
    Diet,
    Ingredient,
    Collaboration,
    ShoppingList,
    ShoppingListItem,
)


@admin.register(AnimalType)
class AnimalTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('name',)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'symbol', 'conversion_factor')
    search_fields = ('name', 'symbol')
    list_filter = ('symbol',)
    ordering = ('name',)


@admin.register(IngredientCategory)
class IngredientCategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'description')
    search_fields = ('code', 'name')
    list_filter = ('code',)
    ordering = ('code',)


@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = ('name', 'species', 'owner', 'weight_kg', 'date_of_birth', 'is_active', 'created_at')
    list_filter = ('is_active', 'species', 'created_at')
    search_fields = ('name', 'owner__username', 'owner__email')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('owner',)
    autocomplete_fields = ('species',)
    ordering = ('-created_at',)
    fieldsets = (
        ('Informacje podstawowe', {
            'fields': ('name', 'species', 'owner', 'is_active')
        }),
        ('Szczegóły', {
            'fields': ('date_of_birth', 'weight_kg', 'note')
        }),
        ('Metadane', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Użyj all_objects aby pokazać również usunięte (soft delete)."""
        return Animal.all_objects.all()


@admin.register(Diet)
class DietAdmin(admin.ModelAdmin):
    list_display = ('animal', 'start_date', 'end_date', 'total_daily_mass', 'is_active', 'created_at')
    list_filter = ('is_active', 'start_date', 'end_date', 'created_at')
    search_fields = ('animal__name', 'animal__owner__username')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('animal',)
    date_hierarchy = 'start_date'
    ordering = ('-start_date',)
    fieldsets = (
        ('Informacje podstawowe', {
            'fields': ('animal', 'is_active')
        }),
        ('Okres diety', {
            'fields': ('start_date', 'end_date', 'total_daily_mass')
        }),
        ('Opis', {
            'fields': ('description',)
        }),
        ('Metadane', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Użyj all_objects aby pokazać również usunięte (soft delete)."""
        return Diet.all_objects.all()


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'diet', 'category', 'cooking_method', 'amount', 'unit', 'is_active')
    list_filter = ('is_active', 'cooking_method', 'category', 'created_at')
    search_fields = ('name', 'diet__animal__name')
    readonly_fields = ('created_at', 'updated_at', 'amount_in_base_unit')
    raw_id_fields = ('diet',)
    autocomplete_fields = ('category', 'unit')
    ordering = ('-created_at',)
    fieldsets = (
        ('Informacje podstawowe', {
            'fields': ('name', 'diet', 'category', 'is_active')
        }),
        ('Szczegóły składnika', {
            'fields': ('cooking_method', 'amount', 'unit', 'amount_in_base_unit')
        }),
        ('Metadane', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Użyj all_objects aby pokazać również usunięte (soft delete)."""
        return Ingredient.all_objects.all()


@admin.register(Collaboration)
class CollaborationAdmin(admin.ModelAdmin):
    list_display = ('animal', 'user', 'permission', 'is_active', 'created_at')
    list_filter = ('is_active', 'permission', 'created_at')
    search_fields = ('animal__name', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('animal', 'user')
    ordering = ('-created_at',)
    fieldsets = (
        ('Informacje podstawowe', {
            'fields': ('animal', 'user', 'permission', 'is_active')
        }),
        ('Metadane', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Użyj all_objects aby pokazać również usunięte (soft delete)."""
        return Collaboration.all_objects.all()


@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'is_completed', 'is_active', 'created_at')
    list_filter = ('is_active', 'is_completed', 'created_at')
    search_fields = ('title', 'created_by__username', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('created_by',)
    filter_horizontal = ('diets',)
    ordering = ('-created_at',)
    fieldsets = (
        ('Informacje podstawowe', {
            'fields': ('title', 'created_by', 'is_active', 'is_completed')
        }),
        ('Diety', {
            'fields': ('diets',)
        }),
        ('Metadane', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Użyj all_objects aby pokazać również usunięte (soft delete)."""
        return ShoppingList.all_objects.all()


@admin.register(ShoppingListItem)
class ShoppingListItemAdmin(admin.ModelAdmin):
    list_display = ('ingredient_name', 'category', 'shopping_list', 'total_amount', 'unit', 'is_checked', 'is_active')
    list_filter = ('is_active', 'is_checked', 'category', 'created_at')
    search_fields = ('ingredient_name', 'category', 'shopping_list__title')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('shopping_list',)
    autocomplete_fields = ('unit',)
    ordering = ('-created_at',)
    fieldsets = (
        ('Informacje podstawowe', {
            'fields': ('shopping_list', 'ingredient_name', 'category', 'is_active', 'is_checked')
        }),
        ('Ilość', {
            'fields': ('total_amount', 'unit')
        }),
        ('Metadane', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Użyj all_objects aby pokazać również usunięte (soft delete)."""
        return ShoppingListItem.all_objects.all()
