# Utiliser nginx pour servir les fichiers statiques
FROM nginx:alpine

# Labels
LABEL maintainer="Honeypot Dashboard Team"
LABEL description="Dashboard modulaire pour surveillance Honeypot"
LABEL version="2.0"

# Copier les fichiers du dashboard dans le bon ordre
# Structure modulaire
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Configuration nginx optimisée pour SPA et modules ES6
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Compression gzip \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss; \
    \
    # Headers de sécurité \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    \
    # Support des modules ES6 \
    location ~ \.js$ { \
        add_header Content-Type "application/javascript; charset=utf-8"; \
        add_header Access-Control-Allow-Origin *; \
    } \
    \
    # Support des fichiers CSS \
    location ~ \.css$ { \
        add_header Content-Type "text/css; charset=utf-8"; \
        add_header Access-Control-Allow-Origin *; \
    } \
    \
    # Route principale \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Access-Control-Allow-Origin *; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
    \
    # Cache pour les ressources statiques \
    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 30d; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Créer un fichier de santé
RUN echo "OK" > /usr/share/nginx/html/health

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]