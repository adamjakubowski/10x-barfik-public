# ============================================
# Stage 1: Builder - budowanie aplikacji
# ============================================
FROM node:24.12.0-alpine as builder

# Ustawienie katalogu roboczego
WORKDIR /app

# Kopiowanie plików package
COPY src/package*.json ./

# Instalacja zależności
RUN npm ci --only=production=false

# Kopiowanie kodu źródłowego
COPY src/ .

# Build aplikacji dla produkcji
RUN npm run build


# ============================================
# Stage 2: Runtime - serwer produkcyjny
# ============================================
FROM nginx:1.27-alpine

# Metadane obrazu
LABEL maintainer="Barfik Team"
LABEL description="Frontend React/Vite dla aplikacji Barfik"

# Usunięcie domyślnej konfiguracji nginx
RUN rm /etc/nginx/conf.d/default.conf

# Kopiowanie custom nginx config
COPY nginx.conf /etc/nginx/conf.d/

# Kopiowanie zbudowanej aplikacji z builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Kopiowanie skryptu entrypoint dla dynamic environment variables
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Uruchomienie nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
