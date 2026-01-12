"""
URL configuration for barfik_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from barfik_system import views


def health_check(request):
    """Health check endpoint for Docker."""
    return JsonResponse({"status": "healthy", "service": "barfik-backend"})

# Router dla API
router = DefaultRouter()

# Dictionary endpoints
router.register(r'animal-types', views.AnimalTypeViewSet, basename='animaltype')
router.register(r'units', views.UnitViewSet, basename='unit')
router.register(r'ingredient-categories', views.IngredientCategoryViewSet, basename='ingredientcategory')

# Main endpoints
router.register(r'animals', views.AnimalViewSet, basename='animal')
router.register(r'diets', views.DietViewSet, basename='diet')
router.register(r'shopping-lists', views.ShoppingListViewSet, basename='shoppinglist')

# Dashboard
router.register(r'dashboard', views.DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Health check
    path('api/health/', health_check, name='health-check'),
    
    # Auth endpoints
    path('api/auth/register/', views.RegisterView.as_view({'post': 'create'}), name='auth-register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    
    # User endpoints
    path('api/users/me/', views.UserViewSet.as_view({'get': 'me', 'patch': 'update_me'}), name='user-me'),
    path('api/users/search/', views.UserViewSet.as_view({'get': 'search'}), name='user-search'),

    # API Schema (OpenAPI)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Router URLs
    path('api/', include(router.urls)),
    
    # Nested routes - collaborations
    path(
        'api/animals/<int:animal_id>/collaborations/',
        views.CollaborationViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='animal-collaborations-list'
    ),
    path(
        'api/animals/<int:animal_id>/collaborations/<int:pk>/',
        views.CollaborationViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='animal-collaborations-detail'
    ),
    
    # Nested routes - ingredients
    path(
        'api/diets/<int:diet_id>/ingredients/',
        views.IngredientViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='diet-ingredients-list'
    ),
    path(
        'api/diets/<int:diet_id>/ingredients/<int:pk>/',
        views.IngredientViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'put': 'update',
            'delete': 'destroy'
        }),
        name='diet-ingredients-detail'
    ),
    
    # Nested routes - shopping list items
    path(
        'api/shopping-lists/<int:shopping_list_id>/items/',
        views.ShoppingListItemViewSet.as_view({
            'get': 'list'
        }),
        name='shoppinglist-items-list'
    ),
    path(
        'api/shopping-lists/<int:shopping_list_id>/items/<int:pk>/',
        views.ShoppingListItemViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update'
        }),
        name='shoppinglist-items-detail'
    ),
    path(
        'api/shopping-lists/<int:shopping_list_id>/items/<int:pk>/check/',
        views.ShoppingListItemViewSet.as_view({
            'post': 'check'
        }),
        name='shoppinglist-items-check'
    ),
]
