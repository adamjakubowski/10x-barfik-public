#!/bin/sh
set -e

# Create runtime config.js with environment variables
cat > /usr/share/nginx/html/config.js << EOF
window.ENV = {
  API_BASE_URL: "${VITE_API_BASE_URL:-http://localhost:8010}"
};
EOF

echo "Runtime configuration created with API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:8010}"

# Tworzenie prostego pliku health dla nginx
echo "healthy" > /usr/share/nginx/html/health

# Uruchomienie przekazanej komendy (nginx)
exec "$@"
