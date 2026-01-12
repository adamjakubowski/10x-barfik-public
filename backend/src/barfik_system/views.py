"""Widoki DRF dla aplikacji Barfik."""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from django.db.models import Q, Prefetch
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

from .models import (
    AnimalType, Unit, IngredientCategory, Animal, Diet,
    Ingredient, Collaboration, ShoppingList, ShoppingListItem
)
from .serializers import (
    UserSerializer, UserRegistrationSerializer,
    AnimalTypeSerializer, UnitSerializer, IngredientCategorySerializer,
    AnimalListSerializer, AnimalDetailSerializer, AnimalCreateSerializer,
    DietListSerializer, DietDetailSerializer, DietCreateSerializer,
    IngredientSerializer, CollaborationSerializer,
    ShoppingListSerializer, ShoppingListCreateSerializer,
    ShoppingListItemSerializer, DashboardSerializer
)
from .permissions import (
    IsOwnerOrCollaborator, IsOwnerOnly, IsOwnerOrReadOnly,
    CanAccessAnimal, IsShoppingListOwner
)
from . import services


# Auth Views

@extend_schema(tags=['auth'])
class RegisterView(viewsets.GenericViewSet):
    """Rejestracja nowego użytkownika."""
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer
    
    @extend_schema(
        request=UserRegistrationSerializer,
        responses={201: UserSerializer},
        description='Zarejestruj nowego użytkownika'
    )
    def create(self, request):
        """Utwórz nowe konto użytkownika."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(tags=['users'])
class UserViewSet(viewsets.GenericViewSet):
    """Zarządzanie profilem użytkownika."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    @extend_schema(
        responses={200: UserSerializer},
        description='Pobierz profil zalogowanego użytkownika'
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Zwróć profil zalogowanego użytkownika."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @extend_schema(
        request=UserSerializer,
        responses={200: UserSerializer},
        description='Zaktualizuj profil zalogowanego użytkownika'
    )
    @action(detail=False, methods=['patch'])
    def update_me(self, request):
        """Zaktualizuj profil zalogowanego użytkownika."""
        serializer = self.get_serializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(
        tags=['users'],
        parameters=[
            OpenApiParameter('email', OpenApiTypes.STR, description='Email address to search for', required=True)
        ],
        responses={
            200: UserSerializer,
            404: OpenApiResponse(description='User not found')
        },
        description='Search for user by email address'
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for user by email."""
        email = request.query_params.get('email')

        if not email:
            return Response(
                {'email': ['Email parameter is required.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'email': ['Użytkownik nie istnieje']},
                status=status.HTTP_404_NOT_FOUND
            )


# Dashboard ViewSet

@extend_schema(tags=['dashboard'])
class DashboardViewSet(viewsets.GenericViewSet):
    """Dashboard z statystykami i alertami."""
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardSerializer
    
    @extend_schema(
        responses={200: DashboardSerializer},
        description='Pobierz statystyki i alerty dla dashboardu użytkownika'
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Zwróć statystyki i alerty dashboardu."""
        dashboard_data = services.get_dashboard_stats(request.user)
        serializer = self.get_serializer(dashboard_data)
        return Response(serializer.data)


# Dictionary ViewSets

@extend_schema_view(
    list=extend_schema(tags=['animal-types'], description='Lista gatunków zwierząt'),
    retrieve=extend_schema(tags=['animal-types'], description='Szczegóły gatunku'),
)
class AnimalTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """Słownik gatunków zwierząt (tylko odczyt)."""
    queryset = AnimalType.objects.all()
    serializer_class = AnimalTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


@extend_schema_view(
    list=extend_schema(tags=['units'], description='Lista jednostek miar'),
    retrieve=extend_schema(tags=['units'], description='Szczegóły jednostki'),
)
class UnitViewSet(viewsets.ReadOnlyModelViewSet):
    """Słownik jednostek miar (tylko odczyt)."""
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'symbol']
    ordering_fields = ['name', 'symbol']
    ordering = ['name']


@extend_schema_view(
    list=extend_schema(tags=['ingredient-categories'], description='Lista kategorii składników'),
    retrieve=extend_schema(tags=['ingredient-categories'], description='Szczegóły kategorii'),
)
class IngredientCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Słownik kategorii składników (tylko odczyt)."""
    queryset = IngredientCategory.objects.all()
    serializer_class = IngredientCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']
    ordering = ['name']


# Main ViewSets

@extend_schema_view(
    list=extend_schema(
        tags=['animals'],
        description='Lista zwierząt dostępnych dla użytkownika',
        parameters=[
            OpenApiParameter('search', OpenApiTypes.STR, description='Szukaj po nazwie'),
            OpenApiParameter('species_id', OpenApiTypes.INT, description='Filtruj po gatunku'),
            OpenApiParameter('active', OpenApiTypes.BOOL, description='Filtruj po statusie (true=aktywne, false=usunięte, brak=wszystkie)'),
        ]
    ),
    retrieve=extend_schema(tags=['animals'], description='Szczegóły zwierzęcia'),
    create=extend_schema(tags=['animals'], description='Dodaj nowe zwierzę'),
    update=extend_schema(tags=['animals'], description='Zaktualizuj zwierzę'),
    partial_update=extend_schema(tags=['animals'], description='Zaktualizuj zwierzę (częściowo)'),
    destroy=extend_schema(tags=['animals'], description='Usuń zwierzę (soft delete)'),
)
class AnimalViewSet(viewsets.ModelViewSet):
    """CRUD dla zwierząt."""
    permission_classes = [IsAuthenticated, IsOwnerOrCollaborator]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'weight_kg']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Zwróć zwierzęta dostępne dla użytkownika."""
        # Użyj all_objects jeśli parametr active nie jest podany (aby pokazać również usunięte)
        active = self.request.query_params.get('active')
        base_manager = Animal.all_objects if active is None else Animal.objects
        
        queryset = base_manager.filter(
            services.get_accessible_animals(self.request.user)
        ).select_related('species', 'owner').distinct()
        
        # Filtrowanie po species_id
        species_id = self.request.query_params.get('species_id')
        if species_id:
            queryset = queryset.filter(species_id=species_id)
        
        # Filtruj po active tylko jeśli parametr jest jawnie podany
        if active is not None:
            queryset = queryset.filter(is_active=active.lower() == 'true')
        
        # Sortowanie: aktywne zwierzęta najpierw, potem po dacie utworzenia (najnowsze najpierw)
        queryset = queryset.order_by('-is_active', '-created_at')
        
        return queryset
    
    def get_serializer_class(self):
        """Wybierz serializer w zależności od akcji."""
        if self.action == 'list':
            return AnimalListSerializer
        elif self.action == 'create':
            return AnimalCreateSerializer
        return AnimalDetailSerializer
    
    def perform_create(self, serializer):
        """Ustaw właściciela przy tworzeniu."""
        serializer.save(owner=self.request.user)
    
    def perform_destroy(self, instance):
        """Soft delete zamiast fizycznego usunięcia."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


@extend_schema_view(
    list=extend_schema(
        tags=['collaborations'],
        description='Lista współpracowników dla zwierzęcia'
    ),
    create=extend_schema(tags=['collaborations'], description='Dodaj współpracownika'),
    update=extend_schema(tags=['collaborations'], description='Zaktualizuj uprawnienia'),
    partial_update=extend_schema(tags=['collaborations'], description='Zaktualizuj uprawnienia (częściowo)'),
    destroy=extend_schema(tags=['collaborations'], description='Usuń współpracę'),
)
class CollaborationViewSet(viewsets.ModelViewSet):
    """Zarządzanie współpracownikami zwierzęcia."""
    serializer_class = CollaborationSerializer
    permission_classes = [IsAuthenticated, IsOwnerOnly]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Zwróć współprace dla zwierzęcia."""
        animal_id = self.kwargs.get('animal_id')
        return Collaboration.objects.filter(
            animal_id=animal_id,
            is_active=True
        ).select_related('user', 'animal')
    
    def perform_create(self, serializer):
        """Utwórz współpracę z walidacją."""
        animal_id = self.kwargs.get('animal_id')
        animal = Animal.objects.get(id=animal_id)
        
        # Sprawdź czy użytkownik jest właścicielem
        if animal.owner != self.request.user:
            raise PermissionError('Tylko właściciel może dodawać współpracowników.')
        
        user = serializer.validated_data['user']
        permission = serializer.validated_data.get('permission', 'READ_ONLY')
        
        # Użyj serwisu do utworzenia
        try:
            services.create_collaboration(animal, user, permission)
        except ValueError as e:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(str(e))
    
    def perform_destroy(self, instance):
        """Soft delete współpracy."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


@extend_schema_view(
    list=extend_schema(
        tags=['diets'],
        description='Lista diet dostępnych dla użytkownika',
        parameters=[
            OpenApiParameter('animal_id', OpenApiTypes.INT, description='Filtruj po zwierzęciu'),
            OpenApiParameter('active', OpenApiTypes.BOOL, description='Filtruj po statusie aktywności'),
            OpenApiParameter('start_date__gte', OpenApiTypes.DATE, description='Data rozpoczęcia od'),
            OpenApiParameter('end_date__lte', OpenApiTypes.DATE, description='Data zakończenia do'),
        ]
    ),
    retrieve=extend_schema(tags=['diets'], description='Szczegóły diety ze składnikami'),
    create=extend_schema(tags=['diets'], description='Dodaj nową dietę'),
    update=extend_schema(tags=['diets'], description='Zaktualizuj dietę'),
    partial_update=extend_schema(tags=['diets'], description='Zaktualizuj dietę (częściowo)'),
    destroy=extend_schema(tags=['diets'], description='Usuń dietę (soft delete)'),
)
class DietViewSet(viewsets.ModelViewSet):
    """CRUD dla diet."""
    permission_classes = [IsAuthenticated, CanAccessAnimal, IsOwnerOrCollaborator]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-start_date']
    
    def get_queryset(self):
        """Zwróć diety dostępne dla użytkownika."""
        # Użyj all_objects jeśli parametr active nie jest podany (aby pokazać również usunięte)
        active = self.request.query_params.get('active')
        base_manager = Diet.all_objects if active is None else Diet.objects
        
        queryset = base_manager.filter(
            services.get_accessible_diets(self.request.user)
        ).select_related('animal').prefetch_related(
            Prefetch(
                'ingredients',
                queryset=Ingredient.objects.filter(is_active=True).select_related('unit', 'category')
            )
        ).distinct()
        
        # Filtrowanie
        animal_id = self.request.query_params.get('animal_id')
        if animal_id:
            queryset = queryset.filter(animal_id=animal_id)
        
        # Filtruj po active tylko jeśli parametr jest jawnie podany
        if active is not None:
            queryset = queryset.filter(is_active=active.lower() == 'true')
        
        start_date_gte = self.request.query_params.get('start_date__gte')
        if start_date_gte:
            queryset = queryset.filter(start_date__gte=start_date_gte)
        
        end_date_lte = self.request.query_params.get('end_date__lte')
        if end_date_lte:
            queryset = queryset.filter(end_date__lte=end_date_lte)
        
        # Sortowanie: aktywne diety najpierw, potem po dacie rozpoczęcia (najnowsze najpierw)
        queryset = queryset.order_by('-is_active', '-start_date')
        
        return queryset
    
    def get_serializer_class(self):
        """Wybierz serializer w zależności od akcji."""
        if self.action == 'list':
            return DietListSerializer
        elif self.action == 'create':
            return DietCreateSerializer
        return DietDetailSerializer
    
    def perform_destroy(self, instance):
        """Soft delete diety."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


@extend_schema_view(
    list=extend_schema(
        tags=['ingredients'],
        description='Lista składników dla diety',
        parameters=[
            OpenApiParameter('category_id', OpenApiTypes.INT, description='Filtruj po kategorii'),
            OpenApiParameter('cooking_method', OpenApiTypes.STR, description='Filtruj po metodzie (raw/cooked)'),
            OpenApiParameter('search', OpenApiTypes.STR, description='Szukaj po nazwie'),
        ]
    ),
    retrieve=extend_schema(tags=['ingredients'], description='Szczegóły składnika'),
    create=extend_schema(tags=['ingredients'], description='Dodaj składnik do diety'),
    update=extend_schema(tags=['ingredients'], description='Zaktualizuj składnik'),
    partial_update=extend_schema(tags=['ingredients'], description='Zaktualizuj składnik (częściowo)'),
    destroy=extend_schema(tags=['ingredients'], description='Usuń składnik (soft delete)'),
)
class IngredientViewSet(viewsets.ModelViewSet):
    """CRUD dla składników diet."""
    serializer_class = IngredientSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrCollaborator]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'amount', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Zwróć składniki dla diety."""
        diet_id = self.kwargs.get('diet_id')
        queryset = Ingredient.objects.filter(
            diet_id=diet_id,
            is_active=True
        ).select_related('unit', 'category', 'diet', 'diet__animal')
        
        # Filtrowanie
        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        cooking_method = self.request.query_params.get('cooking_method')
        if cooking_method:
            queryset = queryset.filter(cooking_method=cooking_method)
        
        return queryset
    
    def get_diet_for_permission_check(self):
        """Pobierz dietę do sprawdzenia uprawnień przy tworzeniu składnika."""
        diet_id = self.kwargs.get('diet_id')
        return Diet.objects.select_related('animal').get(id=diet_id)

    def check_object_permissions(self, request, obj):
        """
        Sprawdź uprawnienia do obiektu.
        Dla akcji CREATE, sprawdzamy uprawnienia do diety (obiektu nadrzędnego).
        """
        if self.action == 'create':
            # Sprawdź uprawnienia do diety zamiast składnika
            diet = self.get_diet_for_permission_check()
            super().check_object_permissions(request, diet)
        else:
            super().check_object_permissions(request, obj)

    def perform_create(self, serializer):
        """
        Utwórz składnik używając serwisu.

        Uprawnienia są sprawdzane przez check_object_permissions na obiekcie Diet.
        """
        diet_id = self.kwargs.get('diet_id')

        # Sprawdź uprawnienia do diety przed utworzeniem składnika
        diet = self.get_diet_for_permission_check()
        self.check_object_permissions(self.request, diet)

        # Użyj serwisu
        services.create_ingredient(
            diet_id=diet_id,
            **serializer.validated_data
        )
    
    def perform_update(self, serializer):
        """Zaktualizuj składnik używając serwisu."""
        services.update_ingredient(
            ingredient_id=self.get_object().id,
            **serializer.validated_data
        )
    
    def perform_destroy(self, instance):
        """Soft delete składnika używając serwisu."""
        services.delete_ingredient(instance.id)


@extend_schema_view(
    list=extend_schema(
        tags=['shopping-lists'],
        description='Lista zakupów użytkownika',
        parameters=[
            OpenApiParameter('is_completed', OpenApiTypes.BOOL, description='Filtruj po statusie'),
        ]
    ),
    retrieve=extend_schema(tags=['shopping-lists'], description='Szczegóły listy zakupów'),
    create=extend_schema(tags=['shopping-lists'], description='Wygeneruj nową listę zakupów'),
    update=extend_schema(tags=['shopping-lists'], description='Zaktualizuj listę zakupów'),
    partial_update=extend_schema(tags=['shopping-lists'], description='Zaktualizuj listę zakupów (częściowo)'),
    destroy=extend_schema(tags=['shopping-lists'], description='Usuń listę zakupów'),
)
class ShoppingListViewSet(viewsets.ModelViewSet):
    """CRUD dla list zakupów."""
    permission_classes = [IsAuthenticated, IsShoppingListOwner]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'is_completed']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Zwróć listy zakupów użytkownika."""
        queryset = ShoppingList.objects.filter(
            created_by=self.request.user,
            is_active=True
        ).prefetch_related(
            'diets',
            Prefetch(
                'items',
                queryset=ShoppingListItem.objects.filter(is_active=True).select_related('unit')
            )
        )
        
        # Filtrowanie
        is_completed = self.request.query_params.get('is_completed')
        if is_completed is not None:
            queryset = queryset.filter(is_completed=is_completed.lower() == 'true')
        
        return queryset
    
    def get_serializer_class(self):
        """Wybierz serializer w zależności od akcji."""
        if self.action == 'create':
            return ShoppingListCreateSerializer
        return ShoppingListSerializer
    
    def perform_create(self, serializer):
        """Wygeneruj listę zakupów używając serwisu."""
        shopping_list = services.generate_shopping_list(
            user=self.request.user,
            diet_ids=[diet.id for diet in serializer.validated_data['diets']],
            days_count=serializer.validated_data['days_count'],
            title=serializer.validated_data.get('title', '')
        )
        return shopping_list
    
    def create(self, request, *args, **kwargs):
        """Override create dla zwrócenia pełnego obiektu."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shopping_list = self.perform_create(serializer)
        
        # Zwróć pełny obiekt
        output_serializer = ShoppingListSerializer(shopping_list)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def perform_update(self, serializer):
        """Jeśli zmieniono diety lub days_count, przelicz listę."""
        instance = self.get_object()
        old_days = instance.days_count
        old_diets = set(instance.diets.values_list('id', flat=True))
        
        instance = serializer.save()
        
        # Sprawdź czy zmieniły się diety lub days_count
        new_days = instance.days_count
        new_diets = set(instance.diets.values_list('id', flat=True))
        
        if old_days != new_days or old_diets != new_diets:
            services.regenerate_shopping_list(instance.id)
    
    @extend_schema(
        tags=['shopping-lists'],
        description='Oznacz listę jako ukończoną',
        request=None,
        responses={200: ShoppingListSerializer}
    )
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Oznacz listę jako ukończoną."""
        shopping_list = self.get_object()
        shopping_list.is_completed = True
        shopping_list.save(update_fields=['is_completed', 'updated_at'])
        
        serializer = self.get_serializer(shopping_list)
        return Response(serializer.data)
    
    @extend_schema(
        tags=['shopping-lists'],
        description='Oznacz listę jako nieukończoną',
        request=None,
        responses={200: ShoppingListSerializer}
    )
    @action(detail=True, methods=['post'])
    def uncomplete(self, request, pk=None):
        """Oznacz listę jako nieukończoną."""
        shopping_list = self.get_object()
        shopping_list.is_completed = False
        shopping_list.save(update_fields=['is_completed', 'updated_at'])
        
        serializer = self.get_serializer(shopping_list)
        return Response(serializer.data)
    
    def perform_destroy(self, instance):
        """Soft delete listy zakupów."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


@extend_schema_view(
    list=extend_schema(tags=['shopping-lists'], description='Lista pozycji zakupów'),
    retrieve=extend_schema(tags=['shopping-lists'], description='Szczegóły pozycji'),
    update=extend_schema(tags=['shopping-lists'], description='Zaktualizuj pozycję'),
    partial_update=extend_schema(tags=['shopping-lists'], description='Zaktualizuj pozycję (częściowo)'),
)
class ShoppingListItemViewSet(viewsets.ModelViewSet):
    """Zarządzanie pozycjami listy zakupów."""
    serializer_class = ShoppingListItemSerializer
    permission_classes = [IsAuthenticated, IsShoppingListOwner]
    http_method_names = ['get', 'patch', 'post', 'head', 'options']  # GET, PATCH i POST (dla akcji check)
    
    def get_queryset(self):
        """Zwróć pozycje dla listy zakupów."""
        shopping_list_id = self.kwargs.get('shopping_list_id')
        return ShoppingListItem.objects.filter(
            shopping_list_id=shopping_list_id,
            is_active=True
        ).select_related('unit', 'shopping_list')
    
    @extend_schema(
        tags=['shopping-lists'],
        description='Zaznacz/odznacz pozycję jako kupioną',
        request=None,
        responses={200: ShoppingListItemSerializer}
    )
    @action(detail=True, methods=['post'])
    def check(self, request, shopping_list_id=None, pk=None):
        """Toggle is_checked dla pozycji."""
        item = self.get_object()
        item.is_checked = not item.is_checked
        item.save(update_fields=['is_checked', 'updated_at'])
        
        serializer = self.get_serializer(item)
        return Response(serializer.data)
