import os
from datetime import timedelta

class Config:
    """Configuration de base"""
    # Base de données
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://honeypot_user:honeypot_pass@localhost:5432/threats_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Sécurité
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # API
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True
    
    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    
    # Seuils d'alerte
    CRITICAL_RISK_THRESHOLD = 8
    HIGH_RISK_THRESHOLD = 6
    
    # Rétention des données (jours)
    DATA_RETENTION_DAYS = 30
    
    # Rate limiting (si nécessaire)
    RATELIMIT_ENABLED = False
    RATELIMIT_DEFAULT = "100/hour"


class DevelopmentConfig(Config):
    """Configuration pour le développement"""
    DEBUG = True
    FLASK_ENV = 'development'


class ProductionConfig(Config):
    """Configuration pour la production"""
    DEBUG = False
    FLASK_ENV = 'production'
    
    # En production, forcer HTTPS
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


# Sélection de la configuration selon l'environnement
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config():
    """Retourne la configuration selon l'environnement"""
    env = os.environ.get('FLASK_ENV', 'default')
    return config.get(env, config['default'])