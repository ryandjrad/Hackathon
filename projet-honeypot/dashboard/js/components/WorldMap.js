/**
 * Composant WorldMap
 * Affiche une carte mondiale interactive des attaques
 */

import { CONFIG, getCountryInfo } from '../config.js';
import { TimezoneUtils } from '../utils/timezone.js';

export class WorldMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.heatLayer = null;
        this.attackLines = [];
        this.isInitialized = false;
        this.mockLocations = this.generateMockLocations();
        this.init();
    }
    
    /**
     * Initialise la carte
     */
    async init() {
        // Vérifier si Leaflet est disponible
        if (typeof L === 'undefined') {
            console.warn('Leaflet not loaded. Loading now...');
            await this.loadLeaflet();
        }
        
        this.createMap();
        this.addControls();
        this.isInitialized = true;
    }
    
    /**
     * Charge Leaflet dynamiquement si nécessaire
     */
    async loadLeaflet() {
        return new Promise((resolve) => {
            // CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
            
            // JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }
    
    /**
     * Crée la carte
     */
    createMap() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        // Initialiser la carte
        this.map = L.map(this.containerId, {
            center: CONFIG.MAP.DEFAULT_VIEW,
            zoom: CONFIG.MAP.DEFAULT_ZOOM,
            zoomControl: false,
            attributionControl: false
        });
        
        // Ajouter le fond de carte sombre
        L.tileLayer(CONFIG.MAP.TILE_URL, {
            attribution: CONFIG.MAP.ATTRIBUTION,
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
        
        // Style personnalisé pour le conteneur
        container.style.background = '#0a0e27';
    }
    
    /**
     * Ajoute les contrôles personnalisés
     */
    addControls() {
        // Zoom control personnalisé
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);
        
        // Attribution
        L.control.attribution({
            position: 'bottomright'
        }).addTo(this.map);
        
        // Légende personnalisée
        const legend = L.control({ position: 'bottomleft' });
        
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `
                <div class="legend-title">Intensité des Attaques</div>
                <div class="legend-scale">
                    <span class="legend-low">Faible</span>
                    <span class="legend-gradient"></span>
                    <span class="legend-high">Élevée</span>
                </div>
            `;
            return div;
        };
        
        legend.addTo(this.map);
    }
    
    /**
     * Génère des locations mockées pour la démo
     */
    generateMockLocations() {
        return {
            // Principaux pays sources d'attaques
            'CN': { lat: 35.8617, lng: 104.1954, city: 'Beijing' },
            'RU': { lat: 55.7558, lng: 37.6173, city: 'Moscow' },
            'US': { lat: 38.9072, lng: -77.0369, city: 'Washington' },
            'BR': { lat: -15.8267, lng: -47.9218, city: 'Brasília' },
            'IN': { lat: 28.6139, lng: 77.2090, city: 'New Delhi' },
            'VN': { lat: 21.0285, lng: 105.8542, city: 'Hanoi' },
            'ID': { lat: -6.2088, lng: 106.8456, city: 'Jakarta' },
            'KR': { lat: 37.5665, lng: 126.9780, city: 'Seoul' },
            'FR': { lat: 48.8566, lng: 2.3522, city: 'Paris' },
            'DE': { lat: 52.5200, lng: 13.4050, city: 'Berlin' },
            'GB': { lat: 51.5074, lng: -0.1278, city: 'London' },
            'JP': { lat: 35.6762, lng: 139.6503, city: 'Tokyo' },
            'XX': { lat: 0, lng: 0, city: 'Unknown' }
        };
    }
    
    /**
     * Obtient la localisation pour une IP (mockée)
     */
    getLocationForIP(ip, country) {
        // Pour la démo, on utilise le pays s'il est fourni
        if (country && this.mockLocations[country]) {
            const loc = this.mockLocations[country];
            // Ajouter un peu de variation pour éviter la superposition
            return {
                lat: loc.lat + (Math.random() - 0.5) * 5,
                lng: loc.lng + (Math.random() - 0.5) * 5,
                city: loc.city,
                country: country
            };
        }
        
        // Sinon, position aléatoire
        return {
            lat: (Math.random() - 0.5) * 160,
            lng: (Math.random() - 0.5) * 360,
            city: 'Unknown',
            country: 'XX'
        };
    }
    
    /**
     * Ajoute un marqueur d'attaque
     */
    addAttackMarker(threat) {
        if (!this.map) return;
        
        const location = this.getLocationForIP(threat.attacker_ip, threat.country);
        const countryInfo = getCountryInfo(threat.country || 'XX');
        
        // Créer le marqueur circulaire
        const marker = L.circleMarker([location.lat, location.lng], {
            radius: this.calculateRadius(threat.risk_score),
            fillColor: this.getRiskColor(threat.risk_score),
            color: '#fff',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.6,
            className: 'attack-marker'
        }).addTo(this.map);
        
        // Popup avec détails
        const popupContent = `
            <div class="map-popup">
                <div class="popup-header">
                    <span class="popup-flag">${countryInfo.flag}</span>
                    <span class="popup-country">${countryInfo.name}</span>
                </div>
                <div class="popup-details">
                    <div><strong>IP:</strong> ${threat.attacker_ip}</div>
                    <div><strong>Service:</strong> ${threat.service.toUpperCase()}</div>
                    <div><strong>Type:</strong> ${threat.attack_type}</div>
                    <div><strong>Risque:</strong> <span class="risk-badge" style="background: ${this.getRiskColor(threat.risk_score)}">${threat.risk_score}/10</span></div>
                    <div><strong>Heure:</strong> ${TimezoneUtils.formatTime(threat.timestamp)}</div>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent, {
            className: 'custom-popup',
            maxWidth: 250
        });
        
        // Animation d'apparition
        marker.setRadius(0);
        this.animateMarker(marker, this.calculateRadius(threat.risk_score));
        
        // Ajouter à la liste
        this.markers.push({
            marker: marker,
            threat: threat,
            timestamp: new Date()
        });
        
        // Nettoyer les vieux marqueurs (garder les 100 derniers)
        this.cleanupMarkers();
        
        // Ajouter une ligne d'attaque si c'est une attaque critique
        if (threat.risk_score >= 8) {
            this.addAttackLine(location);
        }
    }
    
    /**
     * Anime l'apparition d'un marqueur
     */
    animateMarker(marker, targetRadius) {
        let currentRadius = 0;
        const step = targetRadius / 20;
        
        const animate = () => {
            currentRadius += step;
            if (currentRadius >= targetRadius) {
                marker.setRadius(targetRadius);
                return;
            }
            marker.setRadius(currentRadius);
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Ajoute une ligne d'attaque animée
     */
    addAttackLine(targetLocation) {
        // Position de notre honeypot (Lyon, France)
        const honeypotLocation = { lat: 45.7640, lng: 4.8357 };
        
        // Créer une polyligne courbe
        const points = this.generateCurvedPath(
            [targetLocation.lat, targetLocation.lng],
            [honeypotLocation.lat, honeypotLocation.lng],
            20
        );
        
        const line = L.polyline(points, {
            color: '#ff006e',
            weight: 2,
            opacity: 0.8,
            dashArray: '10, 10',
            className: 'attack-line'
        }).addTo(this.map);
        
        // Animation de la ligne
        this.animateLine(line);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            this.map.removeLayer(line);
        }, 3000);
    }
    
    /**
     * Génère un chemin courbe entre deux points
     */
    generateCurvedPath(start, end, steps) {
        const points = [];
        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;
        
        // Hauteur de la courbe
        const distance = Math.sqrt(
            Math.pow(end[0] - start[0], 2) + 
            Math.pow(end[1] - start[1], 2)
        );
        const height = Math.min(distance * 0.3, 20);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const lat = start[0] * (1 - t) + end[0] * t;
            const lng = start[1] * (1 - t) + end[1] * t;
            
            // Ajouter une courbe
            const curve = Math.sin(t * Math.PI) * height;
            points.push([lat + curve, lng]);
        }
        
        return points;
    }
    
    /**
     * Anime une ligne
     */
    animateLine(line) {
        let offset = 0;
        
        const animate = () => {
            offset = (offset + 1) % 20;
            line.setStyle({ dashOffset: offset });
            
            if (line._map) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Calcule le rayon du marqueur selon le risque
     */
    calculateRadius(riskScore) {
        const { MIN_RADIUS, MAX_RADIUS, SCALE_FACTOR } = CONFIG.MAP.MARKER_SCALE;
        return MIN_RADIUS + (riskScore / 10) * (MAX_RADIUS - MIN_RADIUS);
    }
    
    /**
     * Obtient la couleur selon le niveau de risque
     */
    getRiskColor(riskScore) {
        if (riskScore <= 3) return CONFIG.RISK_LEVELS.LOW.color;
        if (riskScore <= 6) return CONFIG.RISK_LEVELS.MEDIUM.color;
        if (riskScore <= 8) return CONFIG.RISK_LEVELS.HIGH.color;
        return CONFIG.RISK_LEVELS.CRITICAL.color;
    }
    
    /**
     * Nettoie les vieux marqueurs
     */
    cleanupMarkers() {
        const maxMarkers = 100;
        const fadeOutTime = 60000; // 1 minute
        
        // Supprimer les marqueurs trop vieux
        const now = new Date();
        this.markers = this.markers.filter(item => {
            const age = now - item.timestamp;
            
            if (age > fadeOutTime || this.markers.length > maxMarkers) {
                // Fade out animation
                const marker = item.marker;
                marker.setStyle({ fillOpacity: 0, opacity: 0 });
                
                setTimeout(() => {
                    this.map.removeLayer(marker);
                }, 500);
                
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Met à jour avec un lot de menaces
     */
    updateBatch(threats) {
        if (!this.isInitialized || !threats) return;
        
        // Ajouter les menaces récentes
        threats.slice(0, 50).forEach((threat, index) => {
            setTimeout(() => {
                this.addAttackMarker(threat);
            }, index * 100);
        });
    }
    
    /**
     * Centre la carte sur un pays
     */
    focusCountry(countryCode) {
        const location = this.mockLocations[countryCode];
        if (location && this.map) {
            this.map.flyTo([location.lat, location.lng], 5, {
                animate: true,
                duration: 1
            });
        }
    }
    
    /**
     * Réinitialise la vue
     */
    resetView() {
        if (this.map) {
            this.map.flyTo(CONFIG.MAP.DEFAULT_VIEW, CONFIG.MAP.DEFAULT_ZOOM, {
                animate: true,
                duration: 1
            });
        }
    }
    
    /**
     * Active/Désactive la heatmap
     */
    toggleHeatmap() {
        // TODO: Implémenter la heatmap avec Leaflet.heat
        console.log('Heatmap toggle not implemented yet');
    }
    
    /**
     * Redimensionne la carte
     */
    resize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
    
    /**
     * Détruit le composant
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
        this.attackLines = [];
    }
}

// CSS spécifique au composant
const styles = `
<style>
.map-legend {
    background: rgba(26, 31, 74, 0.9);
    padding: 10px;
    border-radius: 8px;
    border: 1px solid rgba(0, 212, 255, 0.2);
    color: #e4e8ff;
}

.legend-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 5px;
}

.legend-scale {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
}

.legend-gradient {
    width: 80px;
    height: 10px;
    background: linear-gradient(90deg, #00ff88, #ffaa00, #ff006e);
    border-radius: 5px;
}

.attack-marker {
    animation: pulse-marker 2s infinite;
}

@keyframes pulse-marker {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.attack-line {
    animation: dash-animation 20s linear infinite;
}

@keyframes dash-animation {
    to { stroke-dashoffset: -100; }
}

.map-popup .popup-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.popup-flag {
    font-size: 24px;
}

.popup-country {
    font-weight: 600;
    font-size: 14px;
}

.popup-details {
    font-size: 12px;
}

.popup-details > div {
    margin: 4px 0;
}

.risk-badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
    color: white;
}

.custom-popup .leaflet-popup-content-wrapper {
    background: rgba(26, 31, 74, 0.95);
    color: #e4e8ff;
    border: 1px solid rgba(0, 212, 255, 0.3);
    border-radius: 12px;
}

.custom-popup .leaflet-popup-tip {
    background: rgba(26, 31, 74, 0.95);
    border: 1px solid rgba(0, 212, 255, 0.3);
}

/* Leaflet overrides pour le thème sombre */
.leaflet-control-zoom a {
    background: rgba(26, 31, 74, 0.9);
    color: #00d4ff;
    border: 1px solid rgba(0, 212, 255, 0.3);
}

.leaflet-control-zoom a:hover {
    background: rgba(0, 212, 255, 0.2);
}

.leaflet-control-attribution {
    background: rgba(26, 31, 74, 0.8);
    color: #a8b2d1;
    font-size: 10px;
}
</style>
`;

// Injecter les styles
if (!document.getElementById('worldmap-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'worldmap-styles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export par défaut
export default WorldMap;