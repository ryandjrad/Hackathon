#!/usr/bin/env python3
"""
Script de test pour vérifier que le honeypot et l'API fonctionnent
"""

import time
import requests
import socket
import telnetlib
from datetime import datetime

# Configuration
API_URL = "http://localhost:5000"
HONEYPOT_HOST = "localhost"

def test_api_health():
    """Test que l'API est accessible"""
    print("🔍 Test de l'API...")
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("✅ API est en ligne!")
            return True
    except:
        print("❌ API n'est pas accessible")
        return False

def test_honeypot_ssh():
    """Test du honeypot SSH"""
    print("\n🔍 Test du honeypot SSH (port 2222)...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((HONEYPOT_HOST, 2222))
        sock.close()
        
        if result == 0:
            print("✅ Honeypot SSH répond!")
            
            # Simuler une tentative de connexion
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect((HONEYPOT_HOST, 2222))
            data = sock.recv(1024)
            print(f"   Banner reçu: {data.decode().strip()}")
            sock.send(b"SSH-2.0-TestClient\r\n")
            sock.close()
            return True
        else:
            print("❌ Honeypot SSH ne répond pas")
            return False
    except Exception as e:
        print(f"❌ Erreur SSH: {e}")
        return False

def test_honeypot_http():
    """Test du honeypot HTTP"""
    print("\n🔍 Test du honeypot HTTP (port 8080)...")
    try:
        # Test d'une page normale
        response = requests.get(f"http://{HONEYPOT_HOST}:8080/")
        print(f"✅ HTTP répond avec status {response.status_code}")
        
        # Test d'un endpoint sensible
        response = requests.get(f"http://{HONEYPOT_HOST}:8080/admin")
        print(f"   /admin retourne status {response.status_code}")
        
        # Test SQL injection
        response = requests.get(f"http://{HONEYPOT_HOST}:8080/login?user=' OR 1=1--")
        print("   Tentative SQL injection envoyée")
        
        return True
    except Exception as e:
        print(f"❌ Erreur HTTP: {e}")
        return False

def test_honeypot_telnet():
    """Test du honeypot Telnet"""
    print("\n🔍 Test du honeypot Telnet (port 2323)...")
    try:
        tn = telnetlib.Telnet(HONEYPOT_HOST, 2323, timeout=5)
        banner = tn.read_until(b"Login:", timeout=2)
        print(f"✅ Telnet répond!")
        print(f"   Banner: {banner.decode().strip()}")
        
        # Envoyer username/password
        tn.write(b"admin\n")
        tn.read_until(b"Password:", timeout=2)
        tn.write(b"password\n")
        
        response = tn.read_until(b"incorrect", timeout=2)
        tn.close()
        
        return True
    except Exception as e:
        print(f"❌ Erreur Telnet: {e}")
        return False

def check_api_data():
    """Vérifie que l'API a reçu des données"""
    print("\n📊 Vérification des données dans l'API...")
    time.sleep(2)  # Attendre que les données soient envoyées
    
    try:
        # Récupérer les stats
        response = requests.get(f"{API_URL}/api/stats?hours=1")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Statistiques de la dernière heure:")
            print(f"   - Total menaces: {stats['total_threats']}")
            print(f"   - Attaquants uniques: {stats['unique_attackers']}")
            print(f"   - Score de risque moyen: {stats['average_risk_score']}")
            
            # Afficher les types d'attaques
            if stats['top_attack_types']:
                print("\n   Top des types d'attaques:")
                for attack in stats['top_attack_types']:
                    print(f"   - {attack['type']}: {attack['count']} fois")
        
        # Récupérer les dernières menaces
        response = requests.get(f"{API_URL}/api/threats?per_page=5")
        if response.status_code == 200:
            data = response.json()
            print(f"\n   Dernières menaces détectées: {data['total']}")
            for threat in data['threats'][:3]:
                print(f"   - {threat['timestamp']}: {threat['attack_type']} depuis {threat['attacker_ip']}")
                
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des données: {e}")

def main():
    print("🚀 Test du système Honeypot + API\n")
    print("=" * 50)
    
    # Test de l'API
    if not test_api_health():
        print("\n⚠️  L'API doit être démarrée en premier!")
        print("Lancez: docker-compose up -d")
        return
    
    # Test des honeypots
    ssh_ok = test_honeypot_ssh()
    http_ok = test_honeypot_http()
    telnet_ok = test_honeypot_telnet()
    
    # Vérifier les données
    if ssh_ok or http_ok or telnet_ok:
        check_api_data()
    
    # Résumé
    print("\n" + "=" * 50)
    print("📋 RÉSUMÉ DES TESTS:")
    print(f"   API: {'✅' if test_api_health() else '❌'}")
    print(f"   SSH Honeypot: {'✅' if ssh_ok else '❌'}")
    print(f"   HTTP Honeypot: {'✅' if http_ok else '❌'}")
    print(f"   Telnet Honeypot: {'✅' if telnet_ok else '❌'}")
    
    print("\n💡 Conseil: Consultez http://localhost:8081 pour voir la base de données")
    print("   Utilisateur: honeypot_user | Mot de passe: honeypot_pass")

if __name__ == "__main__":
    main()