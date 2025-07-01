#!/usr/bin/env python3
"""
API de collecte des menaces du Honeypot
Reçoit, stocke et analyse les données d'attaques
"""

import os
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import func
import json

# Configuration
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 
    'postgresql://honeypot_user:honeypot_pass@localhost:5432/threats_db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Extensions
db = SQLAlchemy(app)
CORS(app)  # Pour permettre les requêtes cross-origin

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('threat_api')


# Modèles
class Threat(db.Model):
    """Modèle pour stocker les menaces détectées"""
    __tablename__ = 'threats'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    honeypot_id = db.Column(db.String(50), nullable=False)
    service = db.Column(db.String(50), nullable=False)
    attacker_ip = db.Column(db.String(45), nullable=False)
    attacker_port = db.Column(db.Integer)
    attack_type = db.Column(db.String(100), nullable=False)
    risk_score = db.Column(db.Integer, default=5)
    payload = db.Column(db.JSON)
    
    # Index pour les requêtes fréquentes
    __table_args__ = (
        db.Index('idx_timestamp', 'timestamp'),
        db.Index('idx_attacker_ip', 'attacker_ip'),
        db.Index('idx_attack_type', 'attack_type'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'honeypot_id': self.honeypot_id,
            'service': self.service,
            'attacker_ip': self.attacker_ip,
            'attacker_port': self.attacker_port,
            'attack_type': self.attack_type,
            'risk_score': self.risk_score,
            'payload': self.payload
        }


class AttackerProfile(db.Model):
    """Profil des attaquants (IP uniques)"""
    __tablename__ = 'attacker_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), unique=True, nullable=False)
    first_seen = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    total_attacks = db.Column(db.Integer, default=0)
    risk_level = db.Column(db.String(20), default='low')  # low, medium, high, critical
    country = db.Column(db.String(2))  # Code pays ISO
    
    def to_dict(self):
        return {
            'ip_address': self.ip_address,
            'first_seen': self.first_seen.isoformat(),
            'last_seen': self.last_seen.isoformat(),
            'total_attacks': self.total_attacks,
            'risk_level': self.risk_level,
            'country': self.country
        }


# Routes API
@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de santé pour Docker"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})


@app.route('/api/threats', methods=['POST'])
def create_threat():
    """Enregistre une nouvelle menace détectée par le honeypot"""
    try:
        data = request.json
        
        # Créer la menace
        threat = Threat(
            timestamp=datetime.fromisoformat(data['timestamp']),
            honeypot_id=data['honeypot_id'],
            service=data['service'],
            attacker_ip=data['attacker_ip'],
            attacker_port=data.get('attacker_port'),
            attack_type=data['attack_type'],
            risk_score=data.get('risk_score', 5),
            payload=data.get('payload', {})
        )
        
        # Mettre à jour le profil de l'attaquant
        attacker = AttackerProfile.query.filter_by(ip_address=data['attacker_ip']).first()
        if not attacker:
            attacker = AttackerProfile(
                ip_address=data['attacker_ip'],
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                total_attacks=0,
                risk_level='low'
            )
            db.session.add(attacker)
            db.session.flush()  # Pour s'assurer que l'objet est créé
        
        # Mettre à jour les infos de l'attaquant
        attacker.last_seen = datetime.utcnow()
        attacker.total_attacks = (attacker.total_attacks or 0) + 1  # Gérer le cas où c'est None
        
        # Ajuster le niveau de risque
        if attacker.total_attacks > 100:
            attacker.risk_level = 'critical'
        elif attacker.total_attacks > 50:
            attacker.risk_level = 'high'
        elif attacker.total_attacks > 10:
            attacker.risk_level = 'medium'
        
        db.session.add(threat)
        db.session.commit()
        
        logger.info(f"Threat recorded: {data['attacker_ip']} - {data['attack_type']}")
        
        # Vérifier si une alerte doit être déclenchée
        if threat.risk_score >= 8:
            trigger_alert(threat)
        
        return jsonify({
            'status': 'success',
            'threat_id': threat.id,
            'message': 'Threat recorded successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Error recording threat: {e}")
        db.session.rollback()  # Annuler la transaction en cas d'erreur
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/threats', methods=['GET'])
def get_threats():
    """Récupère les menaces avec filtres optionnels"""
    try:
        # Paramètres de pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Filtres
        service = request.args.get('service')
        attack_type = request.args.get('attack_type')
        attacker_ip = request.args.get('attacker_ip')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Construire la requête
        query = Threat.query
        
        if service:
            query = query.filter_by(service=service)
        if attack_type:
            query = query.filter_by(attack_type=attack_type)
        if attacker_ip:
            query = query.filter_by(attacker_ip=attacker_ip)
        if start_date:
            query = query.filter(Threat.timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Threat.timestamp <= datetime.fromisoformat(end_date))
        
        # Ordonner par timestamp décroissant
        query = query.order_by(Threat.timestamp.desc())
        
        # Paginer
        threats = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'threats': [t.to_dict() for t in threats.items],
            'total': threats.total,
            'page': page,
            'per_page': per_page,
            'total_pages': threats.pages
        })
        
    except Exception as e:
        logger.error(f"Error fetching threats: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/threats/<int:threat_id>', methods=['GET'])
def get_threat(threat_id):
    """Récupère une menace spécifique"""
    threat = Threat.query.get_or_404(threat_id)
    return jsonify(threat.to_dict())


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Statistiques globales sur les menaces"""
    try:
        # Période (dernières 24h par défaut)
        hours = request.args.get('hours', 24, type=int)
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Stats globales
        total_threats = Threat.query.filter(Threat.timestamp >= since).count()
        unique_attackers = db.session.query(func.count(func.distinct(Threat.attacker_ip)))\
            .filter(Threat.timestamp >= since).scalar()
        
        # Top 5 des types d'attaques
        top_attacks = db.session.query(
            Threat.attack_type, 
            func.count(Threat.id).label('count')
        ).filter(Threat.timestamp >= since)\
         .group_by(Threat.attack_type)\
         .order_by(func.count(Threat.id).desc())\
         .limit(5).all()
        
        # Top 5 des IP attaquantes
        top_ips = db.session.query(
            Threat.attacker_ip,
            func.count(Threat.id).label('count')
        ).filter(Threat.timestamp >= since)\
         .group_by(Threat.attacker_ip)\
         .order_by(func.count(Threat.id).desc())\
         .limit(5).all()
        
        # Distribution par service
        service_dist = db.session.query(
            Threat.service,
            func.count(Threat.id).label('count')
        ).filter(Threat.timestamp >= since)\
         .group_by(Threat.service).all()
        
        # Score de risque moyen
        avg_risk = db.session.query(func.avg(Threat.risk_score))\
            .filter(Threat.timestamp >= since).scalar() or 0
        
        return jsonify({
            'period_hours': hours,
            'total_threats': total_threats,
            'unique_attackers': unique_attackers,
            'average_risk_score': round(float(avg_risk), 2),
            'top_attack_types': [
                {'type': attack, 'count': count} 
                for attack, count in top_attacks
            ],
            'top_attackers': [
                {'ip': ip, 'count': count}
                for ip, count in top_ips
            ],
            'service_distribution': [
                {'service': service, 'count': count}
                for service, count in service_dist
            ]
        })
        
    except Exception as e:
        logger.error(f"Error calculating stats: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/attackers', methods=['GET'])
def get_attackers():
    """Liste des profils d'attaquants"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        risk_level = request.args.get('risk_level')
        
        query = AttackerProfile.query
        
        if risk_level:
            query = query.filter_by(risk_level=risk_level)
        
        # Ordonner par nombre d'attaques décroissant
        query = query.order_by(AttackerProfile.total_attacks.desc())
        
        attackers = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'attackers': [a.to_dict() for a in attackers.items],
            'total': attackers.total,
            'page': page,
            'per_page': per_page,
            'total_pages': attackers.pages
        })
        
    except Exception as e:
        logger.error(f"Error fetching attackers: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/alerts/test', methods=['POST'])
def test_alert():
    """Endpoint de test pour les alertes"""
    data = request.json or {}
    message = data.get('message', 'Test alert from API')
    
    logger.warning(f"TEST ALERT: {message}")
    
    return jsonify({
        'status': 'success',
        'message': 'Test alert sent'
    })


def trigger_alert(threat):
    """Déclenche une alerte pour une menace critique"""
    alert_message = (
        f"🚨 ALERTE CRITIQUE 🚨\n"
        f"Type: {threat.attack_type}\n"
        f"Service: {threat.service}\n"
        f"Attaquant: {threat.attacker_ip}\n"
        f"Score de risque: {threat.risk_score}/10\n"
        f"Timestamp: {threat.timestamp}"
    )
    logger.critical(alert_message)
    # Ici vous pourriez ajouter l'envoi d'email, webhook, etc.


# Initialisation de la base de données
with app.app_context():
    try:
        db.create_all()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")


if __name__ == '__main__':
    os.makedirs('/app/logs', exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)