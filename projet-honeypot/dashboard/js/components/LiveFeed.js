/**
 * Composant LiveFeed
 * Affiche les attaques en temps réel avec animations
 */

import { TimezoneUtils } from '../utils/timezone.js';
import { CONFIG, getRiskLevel, getCountryInfo, getAttackTypeInfo } from '../config.js';

export class LiveFeed {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.items = [];
        this.maxItems = CONFIG.MAX_FEED_ITEMS;
        this.isPaused = false;
        this.filters = {
            service: null,
            minRisk: 0,
            country: null
        };
        this.init();
    }
    
    /**
     * Initialise le composant
     */
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    /**
     * Génère le HTML du composant
     */
    render() {
        this.container.innerHTML = `
            <div class="live-feed-container">
                <div class="live-feed-header">
                    <div class="live-feed-title">
                        <span class="live-indicator"></span>
                        <h3>Activité en Temps Réel</h3>
                        <span class="feed-counter">(0)</span>
                    </div>
                    <div class="live-feed-controls">
                        <button class="feed-control-btn" id="feed-pause" title="Pause">
                            <i class="fas fa-pause"></i>
                        </button>
                        <button class="feed-control-btn" id="feed-clear" title="Effacer">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="feed-control-btn" id="feed-filter" title="Filtrer">
                            <i class="fas fa-filter"></i>
                        </button>
                    </div>
                </div>
                
                <div class="feed-filters" id="feed-filters" style="display: none;">
                    <select id="filter-service" class="feed-filter-select">
                        <option value="">Tous les services</option>
                        <option value="ssh">SSH</option>
                        <option value="http">HTTP</option>
                        <option value="telnet">Telnet</option>
                    </select>
                    <select id="filter-risk" class="feed-filter-select">
                        <option value="0">Tous les risques</option>
                        <option value="4">Risque moyen+</option>
                        <option value="7">Risque élevé+</option>
                        <option value="9">Critique seulement</option>
                    </select>
                </div>
                
                <div class="live-feed-content" id="live-feed-items">
                    <div class="feed-empty">En attente d'activité...</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Attache les event listeners
     */
    attachEventListeners() {
        // Pause/Resume
        document.getElementById('feed-pause').addEventListener('click', () => {
            this.togglePause();
        });
        
        // Clear
        document.getElementById('feed-clear').addEventListener('click', () => {
            this.clear();
        });
        
        // Filter toggle
        document.getElementById('feed-filter').addEventListener('click', () => {
            const filters = document.getElementById('feed-filters');
            filters.style.display = filters.style.display === 'none' ? 'flex' : 'none';
        });
        
        // Filter changes
        document.getElementById('filter-service').addEventListener('change', (e) => {
            this.filters.service = e.target.value || null;
            this.applyFilters();
        });
        
        document.getElementById('filter-risk').addEventListener('change', (e) => {
            this.filters.minRisk = parseInt(e.target.value) || 0;
            this.applyFilters();
        });
    }
    
    /**
     * Ajoute une nouvelle menace au feed
     * @param {object} threat 
     */
    addThreat(threat) {
        if (this.isPaused) return;
        
        // Vérifier les filtres
        if (!this.matchesFilters(threat)) return;
        
        // Créer l'élément
        const item = this.createFeedItem(threat);
        
        // Ajouter au début
        const container = document.getElementById('live-feed-items');
        const emptyMessage = container.querySelector('.feed-empty');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        container.insertBefore(item, container.firstChild);
        
        // Gérer le nombre max d'items
        while (container.children.length > this.maxItems) {
            container.removeChild(container.lastChild);
        }
        
        // Mettre à jour le compteur
        this.updateCounter();
        
        // Animation d'entrée
        setTimeout(() => item.classList.add('visible'), 10);
        
        // Notification pour risque élevé
        if (threat.risk_score >= 8) {
            this.triggerHighRiskAlert(threat);
        }
    }
    
    /**
     * Crée un élément de feed
     * @param {object} threat 
     * @returns {HTMLElement}
     */
    createFeedItem(threat) {
        const item = document.createElement('div');
        const riskLevel = getRiskLevel(threat.risk_score);
        const countryInfo = getCountryInfo(threat.country || 'XX');
        const attackInfo = getAttackTypeInfo(threat.attack_type);
        const time = TimezoneUtils.formatTime(threat.timestamp);
        
        item.className = `feed-item risk-${riskLevel.label.toLowerCase()}`;
        if (threat.risk_score >= 8) {
            item.classList.add('critical');
        }
        
        item.innerHTML = `
            <div class="feed-item-time">${time}</div>
            <div class="feed-item-country">
                <span class="country-flag">${countryInfo.flag}</span>
                <span class="country-code">${threat.country || 'XX'}</span>
            </div>
            <div class="feed-item-details">
                <div class="feed-item-ip">${threat.attacker_ip}</div>
                <div class="feed-item-attack">
                    <span class="attack-icon">${attackInfo.icon}</span>
                    <span class="attack-type">${attackInfo.label}</span>
                    <span class="attack-service">${threat.service.toUpperCase()}</span>
                </div>
            </div>
            <div class="feed-item-risk">
                <div class="risk-score" style="background: ${riskLevel.color}20; color: ${riskLevel.color}">
                    ${threat.risk_score}/10
                </div>
            </div>
        `;
        
        // Click handler pour les détails
        item.addEventListener('click', () => {
            this.showThreatDetails(threat);
        });
        
        return item;
    }
    
    /**
     * Vérifie si une menace correspond aux filtres
     * @param {object} threat 
     * @returns {boolean}
     */
    matchesFilters(threat) {
        if (this.filters.service && threat.service !== this.filters.service) {
            return false;
        }
        
        if (this.filters.minRisk && threat.risk_score < this.filters.minRisk) {
            return false;
        }
        
        if (this.filters.country && threat.country !== this.filters.country) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Applique les filtres aux items existants
     */
    applyFilters() {
        const container = document.getElementById('live-feed-items');
        const items = container.querySelectorAll('.feed-item');
        
        items.forEach(item => {
            // Récupérer les données depuis le DOM (simplification)
            const service = item.querySelector('.attack-service')?.textContent.toLowerCase();
            const risk = parseInt(item.querySelector('.risk-score')?.textContent) || 0;
            
            const show = (!this.filters.service || service === this.filters.service) &&
                        (!this.filters.minRisk || risk >= this.filters.minRisk);
            
            item.style.display = show ? 'flex' : 'none';
        });
    }
    
    /**
     * Basculer pause/resume
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('feed-pause');
        btn.innerHTML = this.isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        
        const container = document.querySelector('.live-feed-container');
        container.classList.toggle('paused', this.isPaused);
    }
    
    /**
     * Efface le feed
     */
    clear() {
        const container = document.getElementById('live-feed-items');
        container.innerHTML = '<div class="feed-empty">Feed effacé. En attente d\'activité...</div>';
        this.updateCounter();
    }
    
    /**
     * Met à jour le compteur
     */
    updateCounter() {
        const container = document.getElementById('live-feed-items');
        const count = container.querySelectorAll('.feed-item').length;
        document.querySelector('.feed-counter').textContent = `(${count})`;
    }
    
    /**
     * Déclenche une alerte pour risque élevé
     * @param {object} threat 
     */
    triggerHighRiskAlert(threat) {
        // Animation visuelle
        const container = document.querySelector('.live-feed-container');
        container.classList.add('alert-flash');
        setTimeout(() => container.classList.remove('alert-flash'), 1000);
        
        // Son si activé
        if (CONFIG.NOTIFICATIONS.SOUND_ENABLED) {
            this.playAlertSound();
        }
    }
    
    /**
     * Joue un son d'alerte
     */
    playAlertSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = CONFIG.SOUNDS.CRITICAL.frequency;
        gainNode.gain.value = CONFIG.SOUNDS.CRITICAL.volume;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + CONFIG.SOUNDS.CRITICAL.duration / 1000);
    }
    
    /**
     * Affiche les détails d'une menace
     * @param {object} threat 
     */
    showThreatDetails(threat) {
        // Émettre un événement personnalisé
        const event = new CustomEvent('threatDetails', { detail: threat });
        document.dispatchEvent(event);
    }
    
    /**
     * Met à jour avec un lot de menaces
     * @param {Array} threats 
     */
    updateBatch(threats) {
        if (!threats || threats.length === 0) return;
        
        // Ajouter les nouvelles menaces
        threats.slice(0, this.maxItems).forEach((threat, index) => {
            setTimeout(() => this.addThreat(threat), index * 50);
        });
    }
    
    /**
     * Détruit le composant
     */
    destroy() {
        this.container.innerHTML = '';
    }
}

// CSS spécifique au composant
const styles = `
<style>
.live-feed-container {
    background: var(--bg-card);
    border-radius: 15px;
    border: 1px solid rgba(0, 212, 255, 0.2);
    overflow: hidden;
    transition: all 0.3s ease;
}

.live-feed-container.paused {
    opacity: 0.7;
}

.live-feed-container.alert-flash {
    animation: alert-flash 0.5s ease;
}

@keyframes alert-flash {
    0%, 100% { border-color: rgba(0, 212, 255, 0.2); }
    50% { border-color: var(--danger); box-shadow: 0 0 20px var(--danger); }
}

.live-feed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.live-feed-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.live-indicator {
    width: 10px;
    height: 10px;
    background: var(--danger);
    border-radius: 50%;
    animation: live-pulse 1s infinite;
}

@keyframes live-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
}

.feed-counter {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.live-feed-controls {
    display: flex;
    gap: 0.5rem;
}

.feed-control-btn {
    background: rgba(0, 212, 255, 0.1);
    border: 1px solid rgba(0, 212, 255, 0.3);
    color: var(--accent-primary);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.feed-control-btn:hover {
    background: rgba(0, 212, 255, 0.2);
    transform: translateY(-2px);
}

.feed-filters {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.feed-filter-select {
    background: var(--bg-secondary);
    border: 1px solid rgba(0, 212, 255, 0.2);
    color: var(--text-primary);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
}

.live-feed-content {
    max-height: 400px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--accent-primary) transparent;
}

.feed-empty {
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
}

.feed-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    opacity: 0;
    transform: translateX(-20px);
    transition: all 0.3s ease;
}

.feed-item.visible {
    opacity: 1;
    transform: translateX(0);
}

.feed-item:hover {
    background: rgba(0, 212, 255, 0.05);
}

.feed-item.critical {
    border-left: 3px solid var(--danger);
    background: rgba(255, 0, 64, 0.05);
}

.feed-item.critical.visible {
    animation: critical-pulse 0.5s ease;
}

@keyframes critical-pulse {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

.feed-item-time {
    font-family: monospace;
    font-size: 0.85rem;
    color: var(--text-secondary);
    min-width: 80px;
}

.feed-item-country {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 60px;
}

.country-flag {
    font-size: 1.5rem;
}

.country-code {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.feed-item-details {
    flex: 1;
}

.feed-item-ip {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.feed-item-attack {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.attack-icon {
    font-size: 1rem;
}

.attack-service {
    background: rgba(0, 212, 255, 0.1);
    padding: 0.1rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
}

.feed-item-risk {
    min-width: 60px;
}

.risk-score {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-align: center;
}

/* Custom scrollbar */
.live-feed-content::-webkit-scrollbar {
    width: 6px;
}

.live-feed-content::-webkit-scrollbar-track {
    background: transparent;
}

.live-feed-content::-webkit-scrollbar-thumb {
    background: var(--accent-primary);
    border-radius: 3px;
}

/* Responsive */
@media (max-width: 768px) {
    .feed-item {
        font-size: 0.85rem;
        padding: 0.5rem 1rem;
    }
    
    .feed-item-time {
        display: none;
    }
    
    .feed-item-details {
        flex-direction: column;
    }
}
</style>
`;

// Injecter les styles
if (!document.getElementById('livefeed-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'livefeed-styles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export par défaut
export default LiveFeed;