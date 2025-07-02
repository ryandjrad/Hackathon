#!/usr/bin/env python3
"""
Honeypot multi-services pour la détection de menaces
Simule SSH, HTTP et Telnet pour capturer les attaques
"""

import asyncio
import json
import logging
import os
import socket
import sys
from datetime import datetime
from typing import Dict, Any
import aiohttp
from aiohttp import web
import configparser

# Configuration du logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/honeypot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('honeypot')

# Configuration globale
API_URL = os.environ.get('API_URL', 'http://localhost:5000')
HONEYPOT_ID = os.environ.get('HONEYPOT_ID', 'honeypot-001')


class AttackLogger:
    """Gère l'enregistrement et l'envoi des attaques détectées"""
    
    def __init__(self):
        self.attack_log_file = '/app/logs/attacks.log'
    
    async def log_attack(self, service: str, attacker_ip: str, attacker_port: int, 
                        attack_type: str, payload: Dict[str, Any]):
        """Enregistre une attaque et l'envoie à l'API"""
        
        attack_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'honeypot_id': HONEYPOT_ID,
            'service': service,
            'attacker_ip': attacker_ip,
            'attacker_port': attacker_port,
            'attack_type': attack_type,
            'payload': payload,
            'risk_score': self._calculate_risk_score(attack_type, payload)
        }
        
        # Log local
        with open(self.attack_log_file, 'a') as f:
            f.write(json.dumps(attack_data) + '\n')
        
        logger.info(f"[{service}] Attack detected from {attacker_ip}:{attacker_port} - Type: {attack_type}")
        
        # Envoi à l'API (sans bloquer si l'API est down)
        asyncio.create_task(self._send_to_api(attack_data))
        
        return attack_data
    
    def _calculate_risk_score(self, attack_type: str, payload: Dict[str, Any]) -> int:
        """Calcule un score de risque basique"""
        risk_scores = {
            'brute_force': 5,
            'command_injection': 8,
            'sql_injection': 7,
            'port_scan': 3,
            'malware_upload': 9,
            'dos_attempt': 6,
            'unauthorized_access': 4
        }
        return risk_scores.get(attack_type, 5)
    
    async def _send_to_api(self, attack_data: Dict[str, Any]):
        """Envoie les données d'attaque à l'API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{API_URL}/api/threats",
                    json=attack_data,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 201:
                        logger.debug("Attack data sent to API successfully")
                    else:
                        logger.warning(f"API returned status {response.status}")
        except Exception as e:
            logger.error(f"Failed to send to API: {e}")


class SSHHoneypot:
    """Simule un serveur SSH vulnérable"""
    
    def __init__(self, attack_logger: AttackLogger):
        self.attack_logger = attack_logger
        self.port = 22
        self.banner = "SSH-2.0-OpenSSH_5.1p1 Debian-5\r\n"  # Vieille version vulnérable
        self.common_passwords = ['admin', '123456', 'password', 'root', '12345']
    
    async def start(self):
        """Démarre le serveur SSH honeypot"""
        server = await asyncio.start_server(
            self.handle_connection, '0.0.0.0', self.port
        )
        logger.info(f"SSH Honeypot started on port {self.port}")
        
        async with server:
            await server.serve_forever()
    
    async def handle_connection(self, reader, writer):
        """Gère une connexion SSH"""
        addr = writer.get_extra_info('peername')
        logger.debug(f"SSH connection from {addr}")
        
        try:
            # Envoyer le banner SSH
            writer.write(self.banner.encode())
            await writer.drain()
            
            # Lire la réponse du client
            data = await reader.read(1024)
            if data:
                # Simuler une tentative de brute force
                await self.attack_logger.log_attack(
                    service='ssh',
                    attacker_ip=addr[0],
                    attacker_port=addr[1],
                    attack_type='brute_force',
                    payload={
                        'client_banner': data.decode('utf-8', errors='ignore'),
                        'attempted_auth': 'password'
                    }
                )
            
            # Fermer la connexion (échec d'authentification)
            writer.write(b"Permission denied\r\n")
            await writer.drain()
            
        except Exception as e:
            logger.error(f"SSH handler error: {e}")
        finally:
            writer.close()
            await writer.wait_closed()


class HTTPHoneypot:
    """Simule un serveur web vulnérable"""
    
    def __init__(self, attack_logger: AttackLogger):
        self.attack_logger = attack_logger
        self.port = 80
        self.fake_paths = [
            '/admin', '/login', '/wp-admin', '/phpmyadmin',
            '/.env', '/config.php', '/backup.sql'
        ]
    
    async def start(self):
        """Démarre le serveur HTTP honeypot"""
        app = web.Application()
        app.router.add_route('*', '/{path:.*}', self.handle_request)
        
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '0.0.0.0', self.port)
        await site.start()
        
        logger.info(f"HTTP Honeypot started on port {self.port}")
    
    async def handle_request(self, request):
        """Gère une requête HTTP"""
        attacker_ip = request.remote
        path = request.path
        
        # Détection du type d'attaque
        attack_type = 'reconnaissance'
        if path in self.fake_paths:
            attack_type = 'unauthorized_access'
        elif 'union' in str(request.url).lower() or 'select' in str(request.url).lower():
            attack_type = 'sql_injection'
        elif '../' in path:
            attack_type = 'path_traversal'
        elif request.method == 'POST' and 'cmd=' in await request.text():
            attack_type = 'command_injection'
        
        # Logger l'attaque
        await self.attack_logger.log_attack(
            service='http',
            attacker_ip=attacker_ip,
            attacker_port=0,  # HTTP ne donne pas le port source facilement
            attack_type=attack_type,
            payload={
                'method': request.method,
                'path': path,
                'headers': dict(request.headers),
                'query': str(request.query_string),
                'user_agent': request.headers.get('User-Agent', 'Unknown')
            }
        )
        
        # Réponse factice
        if path == '/health':
            return web.Response(text='OK', status=200)
        elif path in self.fake_paths:
            return web.Response(text='<html><body><h1>401 Unauthorized</h1></body></html>', 
                              status=401, content_type='text/html')
        else:
            return web.Response(text='<html><body><h1>404 Not Found</h1></body></html>', 
                              status=404, content_type='text/html')


class TelnetHoneypot:
    """Simule un serveur Telnet vulnérable"""
    
    def __init__(self, attack_logger: AttackLogger):
        self.attack_logger = attack_logger
        self.port = 23
        self.banner = b"\r\nLinux 2.6.32 Telnet Server\r\nLogin: "
    
    async def start(self):
        """Démarre le serveur Telnet honeypot"""
        server = await asyncio.start_server(
            self.handle_connection, '0.0.0.0', self.port
        )
        logger.info(f"Telnet Honeypot started on port {self.port}")
        
        async with server:
            await server.serve_forever()
    
    async def handle_connection(self, reader, writer):
        """Gère une connexion Telnet"""
        addr = writer.get_extra_info('peername')
        logger.debug(f"Telnet connection from {addr}")
        
        try:
            # Envoyer le banner
            writer.write(self.banner)
            await writer.drain()
            
            # Lire le username
            username = await reader.read(100)
            if username:
                writer.write(b"Password: ")
                await writer.drain()
                
                # Lire le password
                password = await reader.read(100)
                
                # Logger la tentative
                await self.attack_logger.log_attack(
                    service='telnet',
                    attacker_ip=addr[0],
                    attacker_port=addr[1],
                    attack_type='brute_force',
                    payload={
                        'username': username.decode('utf-8', errors='ignore').strip(),
                        'password': password.decode('utf-8', errors='ignore').strip()
                    }
                )
            
            writer.write(b"\r\nLogin incorrect\r\n")
            await writer.drain()
            
        except Exception as e:
            logger.error(f"Telnet handler error: {e}")
        finally:
            writer.close()
            await writer.wait_closed()


class HoneypotManager:
    """Gestionnaire principal du honeypot"""
    
    def __init__(self):
        self.attack_logger = AttackLogger()
        self.services = {
            'ssh': SSHHoneypot(self.attack_logger),
            'http': HTTPHoneypot(self.attack_logger),
            'telnet': TelnetHoneypot(self.attack_logger)
        }
    
    async def start_all(self):
        """Démarre tous les services honeypot"""
        logger.info(f"Starting Honeypot {HONEYPOT_ID}")
        logger.info(f"API endpoint: {API_URL}")
        
        # Créer les tâches pour chaque service
        tasks = []
        for name, service in self.services.items():
            try:
                task = asyncio.create_task(service.start())
                tasks.append(task)
                logger.info(f"Service {name} scheduled to start")
            except Exception as e:
                logger.error(f"Failed to start {name}: {e}")
        
        # Attendre que tous les services tournent
        await asyncio.gather(*tasks)


async def main():
    """Point d'entrée principal"""
    manager = HoneypotManager()
    
    try:
        await manager.start_all()
    except KeyboardInterrupt:
        logger.info("Honeypot shutting down...")
    except Exception as e:
        logger.error(f"Honeypot error: {e}")
        raise


if __name__ == "__main__":
    # Créer les dossiers si nécessaire
    os.makedirs('/app/logs', exist_ok=True)
    
    # Démarrer le honeypot
    asyncio.run(main())