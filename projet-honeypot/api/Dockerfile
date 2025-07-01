FROM python:3.11-slim-bullseye

# Informations
LABEL maintainer="API Team"
LABEL description="Threat Collection API"

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_HOME=/app

# Créer un utilisateur non-root
RUN groupadd -r api && useradd -r -g api api

# Installer les dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Créer les dossiers
RUN mkdir -p ${APP_HOME}/logs && \
    chown -R api:api ${APP_HOME}

WORKDIR ${APP_HOME}

# Copier les requirements
COPY --chown=api:api requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier le code
COPY --chown=api:api . .

# Créer les logs
RUN touch ${APP_HOME}/logs/api.log && \
    chown api:api ${APP_HOME}/logs/api.log

# Utilisateur non-root
USER api

# Port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Commande
CMD ["python", "app.py"]