# ============================================
# Stage 1: Builder - budowanie zależności
# ============================================
FROM python:3.13.1-slim AS builder

# Ustawienie zmiennych środowiskowych
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instalacja zależności systemowych potrzebnych do budowania
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Tworzenie virtualenv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Kopiowanie i instalacja zależności Python
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt


# ============================================
# Stage 2: Runtime - finalny obraz aplikacji
# ============================================
FROM python:3.13.1-slim

# Metadane obrazu
LABEL maintainer="Barfik Team"
LABEL description="Backend Django API dla aplikacji Barfik"

# Ustawienie zmiennych środowiskowych
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

# Instalacja tylko runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Tworzenie non-root użytkownika
RUN groupadd -r django && \
    useradd -r -g django -d /app -s /sbin/nologin django

# Tworzenie katalogów aplikacji
WORKDIR /app

# Kopiowanie virtualenv z builder stage
COPY --from=builder /opt/venv /opt/venv

# Kopiowanie kodu aplikacji
COPY --chown=django:django src/ /app/

# Tworzenie katalogów dla statycznych plików i mediów
RUN mkdir -p /app/staticfiles /app/media && \
    chown -R django:django /app

# Przełączenie na non-root użytkownika
USER django

# Zbieranie plików statycznych (w tym style Django Admin)
RUN python manage.py collectstatic --noinput

# Expose port dla Uvicorn
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Uruchomienie aplikacji przez Uvicorn (ASGI)
CMD ["uvicorn", "barfik_backend.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
