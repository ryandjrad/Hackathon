# Utiliser nginx pour servir les fichiers statiques
FROM nginx:alpine

# Copier les fichiers du dashboard
COPY . /usr/share/nginx/html

# Configuration nginx pour CORS
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
        add_header Access-Control-Allow-Origin *; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]