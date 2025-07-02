/**
 * Configuration centrale du Dashboard
 * Tous les paramètres modifiables sont ici
 */

export const CONFIG = {
    // === API Configuration ===
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : `${window.location.protocol}//${window.location.hostname}:5000`,
    API_TIMEOUT: 5000, // 5 secondes
    
    // === Update Intervals (ms) ===
    UPDATE_INTERVAL: 5000,        // Mise à jour générale
    CLOCK_UPDATE_INTERVAL: 1000,  // Horloge
    LIVE_FEED_INTERVAL: 3000,     // Feed live
    STATS_UPDATE_INTERVAL: 10000, // Statistiques
    
    // === Cache Configuration ===
    CACHE_DURATION: 60000, // 1 minute
    
    // === Display Settings ===
    MAX_FEED_ITEMS: 20,
    MAX_TABLE_ROWS: 50,
    MAX_ATTACKERS: 10,
    CHART_HOURS_DEFAULT: 24,
    
    // === Risk Levels ===
    RISK_LEVELS: {
        LOW: { max: 3, color: '#00ff88', label: 'Faible' },
        MEDIUM: { max: 6, color: '#ffaa00', label: 'Moyen' },
        HIGH: { max: 8, color: '#ff006e', label: 'Élevé' },
        CRITICAL: { max: 10, color: '#ff0040', label: 'Critique' }
    },
    
    // === Attack Types ===
    ATTACK_TYPES: {
        brute_force: { icon: '🔑', label: 'Brute Force' },
        sql_injection: { icon: '💉', label: 'SQL Injection' },
        command_injection: { icon: '🐚', label: 'Command Injection' },
        path_traversal: { icon: '📁', label: 'Path Traversal' },
        reconnaissance: { icon: '🔍', label: 'Reconnaissance' },
        unauthorized_access: { icon: '🚫', label: 'Accès Non Autorisé' },
        port_scan: { icon: '🔌', label: 'Port Scan' },
        dos_attempt: { icon: '💣', label: 'Tentative DoS' },
        malware_upload: { icon: '🦠', label: 'Upload Malware' }
    },
    
    // === Services ===
    SERVICES: {
        ssh: { icon: '🔐', color: '#00d4ff', port: 2222 },
        http: { icon: '🌐', color: '#00ff88', port: 8080 },
        telnet: { icon: '📞', color: '#ffaa00', port: 2323 }
    },
    
    // === Countries (avec emojis) ===
    COUNTRIES: {
        'CN': { flag: '🇨🇳', name: 'Chine', color: '#ff4444' },
        'RU': { flag: '🇷🇺', name: 'Russie', color: '#4444ff' },
        'US': { flag: '🇺🇸', name: 'États-Unis', color: '#44ff44' },
        'BR': { flag: '🇧🇷', name: 'Brésil', color: '#ffff44' },
        'IN': { flag: '🇮🇳', name: 'Inde', color: '#ff44ff' },
        'VN': { flag: '🇻🇳', name: 'Vietnam', color: '#44ffff' },
        'ID': { flag: '🇮🇩', name: 'Indonésie', color: '#ff8844' },
        'KR': { flag: '🇰🇷', name: 'Corée du Sud', color: '#8844ff' },
        'FR': { flag: '🇫🇷', name: 'France', color: '#4488ff' },
        'DE': { flag: '🇩🇪', name: 'Allemagne', color: '#888888' },
        'GB': { flag: '🇬🇧', name: 'Royaume-Uni', color: '#ff8888' },
        'JP': { flag: '🇯🇵', name: 'Japon', color: '#ff4488' },
        'XX': { flag: '🌍', name: 'Inconnu', color: '#666666' }
    },
    
    // === Chart Colors ===
    CHART_COLORS: [
        '#00d4ff', '#ff006e', '#00ff88', '#ffaa00', 
        '#667eea', '#764ba2', '#f093fb', '#4facfe',
        '#fa709a', '#fee140', '#30cfd0', '#a8edea'
    ],
    
    // === Notifications ===
    NOTIFICATIONS: {
        ENABLED: true,
        SOUND_ENABLED: true,
        CRITICAL_ONLY: false,
        AUTO_DISMISS: 5000, // 5 secondes
        POSITION: 'top-right' // top-right, top-left, bottom-right, bottom-left
    },
    
    // === Theme Settings ===
    THEME: {
        DEFAULT: 'dark',
        AUTO_SWITCH: true, // Basé sur l'heure
        PERSIST: true // Sauvegarder le choix
    },
    
    // === Map Configuration ===
    MAP: {
        TILE_URL: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        ATTRIBUTION: '© OpenStreetMap contributors © CARTO',
        DEFAULT_VIEW: [20, 0], // Latitude, Longitude
        DEFAULT_ZOOM: 2,
        MARKER_SCALE: {
            MIN_RADIUS: 5,
            MAX_RADIUS: 20,
            SCALE_FACTOR: 2
        }
    },
    
    // === Alert Sounds ===
    SOUNDS: {
        NOTIFICATION: {
            frequency: 800,
            duration: 200,
            volume: 0.3
        },
        CRITICAL: {
            frequency: 1200,
            duration: 300,
            volume: 0.5
        },
        WARNING: {
            frequency: 600,
            duration: 150,
            volume: 0.2
        }
    },
    
    // === Export Settings ===
    EXPORT: {
        FILENAME_PREFIX: 'honeypot_threats',
        DATE_FORMAT: 'YYYY-MM-DD',
        INCLUDE_HEADERS: true,
        MAX_ROWS: 10000
    },
    
    // === Performance ===
    PERFORMANCE: {
        DEBOUNCE_DELAY: 300,
        THROTTLE_DELAY: 100,
        MAX_WEBSOCKET_RETRIES: 5,
        RECONNECT_DELAY: 3000
    },
    
    // === Debug Mode ===
    DEBUG: window.location.hostname === 'localhost',
    
    // === Feature Flags ===
    FEATURES: {
        LIVE_MAP: true,
        ML_DETECTION: false,
        WEBSOCKET: false,
        EXPORT_PDF: false,
        MULTI_LANGUAGE: false,
        ADVANCED_FILTERS: true,
        THREAT_INTELLIGENCE: false
    }
};

// Fonction helper pour obtenir la configuration d'un niveau de risque
export function getRiskLevel(score) {
    if (score <= CONFIG.RISK_LEVELS.LOW.max) return CONFIG.RISK_LEVELS.LOW;
    if (score <= CONFIG.RISK_LEVELS.MEDIUM.max) return CONFIG.RISK_LEVELS.MEDIUM;
    if (score <= CONFIG.RISK_LEVELS.HIGH.max) return CONFIG.RISK_LEVELS.HIGH;
    return CONFIG.RISK_LEVELS.CRITICAL;
}

// Fonction helper pour obtenir les infos d'un pays
export function getCountryInfo(code) {
    return CONFIG.COUNTRIES[code] || CONFIG.COUNTRIES['XX'];
}

// Fonction helper pour obtenir les infos d'un type d'attaque
export function getAttackTypeInfo(type) {
    return CONFIG.ATTACK_TYPES[type] || { icon: '❓', label: type };
}

// Fonction helper pour obtenir les infos d'un service
export function getServiceInfo(service) {
    return CONFIG.SERVICES[service] || { icon: '❓', color: '#666666' };
}

// Export par défaut
export default CONFIG;