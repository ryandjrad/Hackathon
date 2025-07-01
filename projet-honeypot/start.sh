#!/bin/bash

# Script de démarrage du système Honeypot + API

echo "🚀 Démarrage du système de détection de menaces..."
echo "=================================================="

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé!"
    echo "Installez Docker depuis: https://docs.docker.com/get-docker/"
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé!"
    exit 1
fi

# Créer les dossiers de logs s'ils n'existent pas
echo "📁 Création des dossiers..."
mkdir -p honeypot/logs api/logs

# Créer les fichiers .gitkeep
touch honeypot/logs/.gitkeep
touch api/logs/.gitkeep

# Construire et démarrer les services
echo -e "\n🔨 Construction des images Docker..."
docker-compose build

echo -e "\n🚀 Démarrage des services..."
docker-compose up -d

# Attendre que les services démarrent
echo -e "\n⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut
echo -e "\n📊 Statut des services:"
docker-compose ps

# Afficher les URLs
echo -e "\n✅ Services démarrés!"
echo "=================================="
echo "🍯 Honeypot:"
echo "   - SSH: localhost:2222"
echo "   - HTTP: http://localhost:8080"
echo "   - Telnet: localhost:2323"
echo ""
echo "🔌 API: http://localhost:5000"
echo "   - Health: http://localhost:5000/health"
echo "   - Stats: http://localhost:5000/api/stats"
echo ""
echo "🗄️ Base de données: http://localhost:8081"
echo "   - User: honeypot_user"
echo "   - Pass: honeypot_pass"
echo ""
echo "📋 Logs:"
echo "   - docker-compose logs -f honeypot"
echo "   - docker-compose logs -f api"
echo ""
echo "🧪 Pour tester: python3 test_system.py"
echo "🛑 Pour arrêter: docker-compose down"