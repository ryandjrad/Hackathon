# 🛡️ Honeypot Security System - README

## 📋 Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Démonstration Hackathon](#démonstration-hackathon)
- [Architecture](#architecture)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Fonctionnalités](#fonctionnalités)
- [Documentation technique](#documentation-technique)
- [Contribution](#contribution)

## 🎯 Vue d'ensemble

### Projet pour le Hackathon ESTIAM 2025 - Sujet 2 : Détection des menaces

Notre solution est un **système de détection de cybermenaces innovant** qui combine :
- 🍯 **Honeypots multi-services** (SSH, HTTP, Telnet) pour attirer les attaquants
- 🤖 **Intelligence Artificielle** pour détecter les anomalies avec Isolation Forest
- 📊 **Dashboard temps réel** avec visualisations interactives
- ⚡ **Réponse automatisée** aux incidents détectés

### 🏆 Points forts pour le jury

1. **Innovation technique** : ML pour détection d'anomalies, architecture microservices
2. **Interface impressionnante** : Dashboard moderne avec carte mondiale en temps réel
3. **Réponse automatisée** : Blocage d'IP, alertes contextuelles, scoring intelligent
4. **Scalabilité** : Architecture Docker prête pour la production

## 🚀 Démonstration Hackathon

### Scénario de démo en 5 minutes

```bash
# 1. Lancer le système (30 secondes)
./start.sh

# 2. Ouvrir le dashboard
firefox http://localhost:3000

# 3. Simuler des attaques variées (2 minutes)
python3 simulate_attacks.py
# Choisir option 1 pour toutes les attaques

# 4. Montrer la détection ML (1 minute)
python3 ml_detector.py

# 5. Démontrer la réponse automatique (1 minute 30)
# - Montrer les alertes critiques
# - Voir le profil d'attaquant évoluer
# - Observer le blocage automatique
```

### Points à mettre en avant pendant la démo

1. **Détection en temps réel** : Les attaques apparaissent instantanément
2. **ML intelligent** : Détection d'attaques coordonnées et patterns inhabituels
3. **Visualisations** : Carte mondiale animée, graphiques dynamiques
4. **Alertes contextuelles** : Son + notification pour menaces critiques
5. **Scoring automatique** : Risk level qui évolue selon la persistance

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Attackers     │────▶│    Honeypots    │────▶│      API        │
│                 │     │  SSH/HTTP/Tel   │     │   Flask/REST    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────┐               │
                        │   ML Detector   │◀──────────────┤
                        │ Anomaly Detection│               │
                        └─────────────────┘               │
                                                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Dashboard    │◀────│   PostgreSQL    │────▶│  Auto Response  │
│   React/JS      │     │    Database     │     │   IP Blocking   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 💻 Installation

### Prérequis
- Docker & Docker Compose
- Python 3.8+
- 4GB RAM minimum
- Ports libres : 2222, 2323, 3000, 5000, 8080

### Installation rapide

```bash
# 1. Cloner le projet
git clone https://github.com/votre-equipe/honeypot-security.git
cd honeypot-security

# 2. Lancer avec Docker
./start.sh

# 3. Accéder aux services
# Dashboard : http://localhost:3000
# API : http://localhost:5000
# Base de données : http://localhost:8081
```

### Installation manuelle

```bash
# 1. Base de données
docker run -d --name honeypot-db \
  -e POSTGRES_USER=honeypot_user \
  -e POSTGRES_PASSWORD=honeypot_pass \
  -e POSTGRES_DB=threats_db \
  -p 5432:5432 \
  postgres:15-alpine

# 2. API
cd api
pip install -r requirements.txt
python app.py

# 3. Honeypot
cd ../honeypot
pip install -r requirements.txt
python app.py

# 4. Dashboard
cd ../dashboard
# Servir avec un serveur web ou ouvrir index.html
```

## 🎮 Utilisation

### Dashboard principal

1. **Statistiques en temps réel**
   - Nombre total de menaces
   - Attaquants uniques
   - Score de risque moyen
   - Taux d'attaques/heure

2. **Live Feed**
   - Flux en temps réel des attaques
   - Filtrage par service/risque
   - Détails au clic

3. **Visualisations**
   - Timeline des attaques
   - Distribution par type
   - Carte mondiale interactive
   - Top attaquants

### Simulateur d'attaques

```bash
python3 simulate_attacks.py

# Options disponibles :
# 1. Toutes les attaques (recommandé pour démo)
# 2. Reconnaissance HTTP
# 3. Brute Force SSH/Telnet
# 4. Injections SQL/Commandes
# 5. Attaque personnalisée
```

### Détecteur ML

```bash
# Analyse ponctuelle
python3 ml_detector.py

# Mode surveillance continue
python3 ml_detector.py --watch
```

## 🔧 Fonctionnalités

### 1. Honeypots intelligents

- **SSH** : Simule OpenSSH 5.1 vulnérable
- **HTTP** : Endpoints piégés (/admin, /wp-admin, /.env)
- **Telnet** : Ancien serveur Linux

### 2. Détection ML avancée

```python
# Caractéristiques analysées :
- Heure de l'attaque
- Type de service ciblé
- Type d'attaque
- Score de risque
- Pattern d'IP
- Taille du payload
- Port source
```

### 3. Réponse automatisée

- ✅ Blocage d'IP après seuil (10 attaques)
- ✅ Isolation des systèmes compromis
- ✅ Alertes multi-canaux (visuel + sonore)
- ✅ Escalade automatique selon risque

### 4. API REST complète

```
GET  /api/threats       # Liste des menaces
GET  /api/stats         # Statistiques
GET  /api/attackers     # Profils d'attaquants
POST /api/threats       # Nouvelle menace
GET  /api/threats/:id   # Détail d'une menace
```

## 📚 Documentation technique

### Structure du projet

```
projet-honeypot/
├── honeypot/           # Services honeypot
│   ├── app.py         # Serveurs SSH/HTTP/Telnet
│   ├── Dockerfile     # Container honeypot
│   └── config/        # Configuration
├── api/               # API REST
│   ├── app.py         # Flask API
│   ├── database/      # Scripts SQL
│   └── requirements.txt
├── dashboard/         # Interface web
│   ├── js/           # Modules JavaScript
│   │   ├── app.js    # Orchestrateur
│   │   ├── components/ # Composants UI
│   │   └── utils/    # Utilitaires
│   └── css/          # Styles et thèmes
├── ml_detector.py     # Détection ML
└── docker-compose.yml # Orchestration
```

### Technologies utilisées

- **Backend** : Python 3.11, Flask, AsyncIO
- **Frontend** : JavaScript ES6, Chart.js, Leaflet
- **Base de données** : PostgreSQL 15
- **ML** : Scikit-learn, Isolation Forest
- **Infrastructure** : Docker, Docker Compose

### Configuration

```yaml
# docker-compose.yml
services:
  honeypot:
    ports:
      - "2222:22"   # SSH
      - "8080:80"   # HTTP
      - "2323:23"   # Telnet
    environment:
      - LOG_LEVEL=INFO
      - API_URL=http://api:5000

  api:
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://...
      - SECRET_KEY=your-secret-key

  dashboard:
    ports:
      - "3000:80"
```

## 🔐 Sécurité

- ✅ Isolation des honeypots en containers
- ✅ Utilisateurs non-root
- ✅ Chiffrement des communications
- ✅ Validation des entrées
- ✅ Rate limiting sur l'API

## 📈 Extensions futures

### Pour améliorer après le hackathon

1. **Honeypots additionnels**
   - FTP, SMB, RDP
   - Services IoT (MQTT)
   - Bases de données

2. **ML avancé**
   - Deep Learning (LSTM)
   - Prédiction d'attaques
   - Classification automatique

3. **Intégrations**
   - SIEM (Splunk, ELK)
   - Notifications Slack/Discord
   - Threat Intelligence feeds

## 🤝 Contribution

### Équipe
- **Chef de projet** : [Nom]
- **Développeur Backend** : [Nom]
- **Développeur Frontend** : [Nom]
- **Expert Cybersécurité** : [Nom]
- **Data Scientist** : [Nom]

### Comment contribuer

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- ESTIAM pour l'organisation du hackathon
- Mentors et experts en cybersécurité
- Communauté open source

---

## 💡 Questions pour améliorer le projet

Voici quelques questions/suggestions pour renforcer votre projet pour le hackathon :

### 1. **Réponse automatisée concrète**
- Avez-vous pensé à implémenter un vrai système de blocage d'IP (iptables/fail2ban) ?
- Voulez-vous ajouter l'isolation réseau automatique via SDN ?

### 2. **Visualisations supplémentaires**
- Graphique de prédiction des prochaines attaques ?
- Matrice de corrélation entre types d'attaques ?
- Timeline 3D des attaques ?

### 3. **ML plus sophistiqué**
- Implémenter plusieurs algorithmes (Random Forest, SVM) et comparer ?
- Ajouter la détection de zero-day patterns ?
- Apprentissage en ligne (online learning) ?

### 4. **Gamification pour la démo**
- Mode "War Games" où le jury peut attaquer ?
- Score en temps réel attaquant vs défenseur ?
- Achievements débloquables ?

### 5. **Intégrations temps réel**
- WebSocket pour vraie communication temps réel ?
- Notifications push sur mobile ?
- Export vers SIEM en temps réel ?

Ces ajouts pourraient vraiment impressionner le jury et montrer la maturité de votre solution !
