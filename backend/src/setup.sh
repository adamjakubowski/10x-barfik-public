#!/bin/bash

# Skrypt setupu dla Barfik Backend API

set -e  # Exit on error

echo "🚀 Barfik Backend Setup"
echo "======================="

# Sprawdź czy jesteśmy w odpowiednim katalogu
if [ ! -f "manage.py" ]; then
    echo "❌ Błąd: Uruchom ten skrypt z katalogu backend/src"
    exit 1
fi

echo ""
echo "📦 Krok 1: Sprawdzanie zależności..."

# Sprawdź Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 nie jest zainstalowany"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✅ Python $PYTHON_VERSION znaleziony"

echo ""
echo "🔧 Krok 2: Uruchamianie migracji..."
python3 manage.py migrate

echo ""
echo "📝 Krok 3: Ładowanie initial data (słowniki)..."
python3 manage.py loaddata barfik_system/fixtures/initial_data.json

echo ""
echo "🔍 Krok 4: Sprawdzanie konfiguracji..."
python3 manage.py check

echo ""
echo "✅ Setup zakończony pomyślnie!"
echo ""
echo "📚 Następne kroki:"
echo "   1. (Opcjonalnie) Utwórz superusera: python manage.py createsuperuser"
echo "   2. Uruchom serwer: python manage.py runserver"
echo "   3. Otwórz dokumentację API: http://127.0.0.1:8000/api/schema/swagger/"
echo ""
echo "🧪 Aby uruchomić testy:"
echo "   pytest"
echo ""
