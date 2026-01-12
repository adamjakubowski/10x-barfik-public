"""Sygnały Django dla automatycznej aktualizacji danych."""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Ingredient
from . import services


@receiver(post_save, sender=Ingredient)
def update_diet_total_on_ingredient_save(sender, instance, created, **kwargs):
    """
    Po zapisaniu składnika zaktualizuj total_daily_mass diety.
    
    Signal wywoływany po każdym save() składnika.
    """
    # Sprawdź czy składnik jest aktywny
    if instance.is_active:
        # Przelicz total dla diety
        services.recalculate_diet_total(instance.diet_id)


@receiver(post_delete, sender=Ingredient)
def update_diet_total_on_ingredient_delete(sender, instance, **kwargs):
    """
    Po usunięciu składnika zaktualizuj total_daily_mass diety.
    
    Note: W systemie używamy soft delete, więc ten signal może nie być często używany.
    """
    # Przelicz total dla diety
    services.recalculate_diet_total(instance.diet_id)
