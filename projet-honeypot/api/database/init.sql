-- Initialisation de la base de données des menaces

-- Créer les tables si elles n'existent pas
CREATE TABLE IF NOT EXISTS threats (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    honeypot_id VARCHAR(50) NOT NULL,
    service VARCHAR(50) NOT NULL,
    attacker_ip VARCHAR(45) NOT NULL,
    attacker_port INTEGER,
    attack_type VARCHAR(100) NOT NULL,
    risk_score INTEGER DEFAULT 5,
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attacker_profiles (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_attacks INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'low',
    country VARCHAR(2),
    notes TEXT
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_threats_timestamp ON threats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_threats_attacker_ip ON threats(attacker_ip);
CREATE INDEX IF NOT EXISTS idx_threats_attack_type ON threats(attack_type);
CREATE INDEX IF NOT EXISTS idx_threats_service ON threats(service);
CREATE INDEX IF NOT EXISTS idx_threats_risk_score ON threats(risk_score);

-- Vue pour les statistiques rapides
CREATE OR REPLACE VIEW threat_stats_hourly AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as threat_count,
    COUNT(DISTINCT attacker_ip) as unique_attackers,
    AVG(risk_score) as avg_risk_score,
    MAX(risk_score) as max_risk_score
FROM threats
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Vue pour les top attaquants
CREATE OR REPLACE VIEW top_attackers AS
SELECT 
    attacker_ip,
    COUNT(*) as attack_count,
    array_agg(DISTINCT service) as targeted_services,
    array_agg(DISTINCT attack_type) as attack_types,
    MAX(risk_score) as max_risk_score,
    MIN(timestamp) as first_attack,
    MAX(timestamp) as last_attack
FROM threats
GROUP BY attacker_ip
ORDER BY attack_count DESC;

-- Fonction pour nettoyer les vieilles données (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_threats(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM threats 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement last_seen dans attacker_profiles
CREATE OR REPLACE FUNCTION update_attacker_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO attacker_profiles (ip_address, total_attacks)
    VALUES (NEW.attacker_ip, 1)
    ON CONFLICT (ip_address)
    DO UPDATE SET
        last_seen = CURRENT_TIMESTAMP,
        total_attacks = attacker_profiles.total_attacks + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER threat_attacker_update
AFTER INSERT ON threats
FOR EACH ROW
EXECUTE FUNCTION update_attacker_profile();

-- Données de test (optionnel, à commenter en production)

INSERT INTO threats (honeypot_id, service, attacker_ip, attack_type, risk_score, payload)
VALUES 
    ('honeypot-001', 'ssh', '192.168.1.100', 'brute_force', 5, '{"username": "admin", "password": "123456"}'),
    ('honeypot-001', 'http', '10.0.0.50', 'sql_injection', 8, '{"path": "/login", "query": "' OR 1=1--"}'),
    ('honeypot-001', 'telnet', '172.16.0.10', 'brute_force', 4, '{"username": "root", "password": "password"}');
