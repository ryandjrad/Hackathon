# Honeypot Multi-Services 🍯

Honeypot simulant des services vulnérables (SSH, HTTP, Telnet) pour détecter et analyser les cybermenaces.

## 🚀 Démarrage rapide

### 1. Prérequis
- Docker et Docker Compose installés
- Port 2222, 8080 et 2323 disponibles

### 2. Lancer le honeypot

```bash
# Construire et démarrer
docker-compose up --build

# Ou en arrière-plan
docker-compose up -d --build