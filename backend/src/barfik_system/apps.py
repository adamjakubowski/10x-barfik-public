from django.apps import AppConfig


class BarfikSystemConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'barfik_system'
    
    def ready(self):
        """Importuj signals gdy aplikacja jest gotowa."""
        import barfik_system.signals  # noqa: F401
