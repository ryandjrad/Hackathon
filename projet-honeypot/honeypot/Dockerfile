# Image de base Python slim pour la sécurité
FROM python:3.11-slim-bullseye

# Informations sur l'image
LABEL maintainer="Honeypot Team"
LABEL description="Multi-service Honeypot for threat detection"
LABEL version="1.0"

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_HOME=/app \
    LOG_DIR=/app/logs \
    CONFIG_DIR=/app/config

# Création d'un utilisateur non-root pour la sécurité
RUN groupadd -r honeypot && useradd -r -g honeypot honeypot

# Installation des dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat \
    tcpdump \
    net-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Création des dossiers nécessaires
RUN mkdir -p ${APP_HOME} ${LOG_DIR} ${CONFIG_DIR} && \
    chown -R honeypot:honeypot ${APP_HOME}

# Définir le répertoire de travail
WORKDIR ${APP_HOME}

# Copier les requirements en premier pour le cache Docker
COPY --chown=honeypot:honeypot requirements.txt .

# Installation des dépendances Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier le code de l'application
COPY --chown=honeypot:honeypot app.py .
COPY --chown=honeypot:honeypot config/ ${CONFIG_DIR}/

# Créer les fichiers de log vides
RUN touch ${LOG_DIR}/honeypot.log ${LOG_DIR}/attacks.log && \
    chown honeypot:honeypot ${LOG_DIR}/*.log

# Changer vers l'utilisateur non-root
USER honeypot

# Ports exposés (SSH, HTTP, Telnet)
EXPOSE 22 80 23

# Healthcheck pour vérifier que le honeypot fonctionne
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Commande de démarrage
CMD ["python", "app.py"]