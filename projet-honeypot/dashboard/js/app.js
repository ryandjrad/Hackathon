/**
 * Application principale du Dashboard Honeypot
 * Orchestre tous les composants et gère les mises à jour
 */

import { CONFIG, getRiskLevel, getCountryInfo } from './config.js';
import { API } from './utils/api.js';
import { TimezoneUtils } from './utils/timezone.js';
import Clock from './components/Clock.js';
import LiveFeed from './components/LiveFeed.js';
import Charts from './components/Charts.js';
import WorldMap from './components/WorldMap.js';

class HoneypotDashboard {
    constructor() {
        this.components = {};
        this.data = {
            stats: null,
            threats: [],
            attackers: []
        };
        this.updateIntervals = {};
        this.lastThreatCount = 0;
        this.soundEnabled = true;
        this.init();
    }
    
    /**
     * Initialise l'application
     */
    async init() {
        console.log('🚀 Dashboard Honeypot démarrage...');
        console.log(`📍 Timezone: ${TimezoneUtils.userTimezone}`);
        console.log(`🔗 API: ${CONFIG.API_URL}`);
        
        // Initialiser les composants
        this.initComponents();
        
        // Configurer les callbacks API
        this.setupAPICallbacks();
        
        // Charger les données initiales
        await this.loadInitialData();
        
        // Démarrer les mises à jour automatiques
        this.startAutoUpdates();
        
        // Attacher les event listeners globaux
        this.attachEventListeners();
        
        // Afficher le statut
        this.updateConnectionStatus(true);
        
        console.log('✅ Dashboard prêt!');
    }
    
    /**
     * Initialise tous les composants
     */
    initComponents() {
        // Clock
        this.components.clock = new Clock('clock-container');
        
        // Live Feed
        this.components.liveFeed = new LiveFeed('live-feed-container');
        
        // Charts
        this.components.charts = new Charts(
            'timeline-chart',
            'types-chart',
            'trends-chart'
        );
        
        // World Map (si le conteneur existe)
        if (document.getElementById('world-map')) {
            this.components.worldMap = new WorldMap('world-map');
        }
    }
    
    /**
     * Configure les callbacks de l'API
     */
    setupAPICallbacks() {
        // Quand l'API passe offline
        API.on('onOffline', () => {
            this.updateConnectionStatus(false);
            this.showNotification('Connexion perdue', 'Tentative de reconnexion...', 'error');
        });
        
        // Quand l'API revient online
        API.on('onOnline', () => {
            this.updateConnectionStatus(true);
            this.showNotification('Connexion rétablie', 'Mise à jour des données...', 'success');
            this.updateDashboard();
        });
        
        // Sur erreur API
        API.on('onError', (error, endpoint) => {
            console.error(`Erreur API sur ${endpoint}:`, error);
        });
    }
    
    /**
     * Charge les données initiales
     */
    async loadInitialData() {
        try {
            // Vérifier la santé de l'API
            const isHealthy = await API.checkHealth();
            if (!isHealthy) {
                throw new Error('API non disponible');
            }
            
            // Charger toutes les données
            await this.updateDashboard();
            
        } catch (error) {
            console.error('Erreur lors du chargement initial:', error);
            this.showNotification(
                'Erreur de connexion',
                'Impossible de se connecter à l\'API. Vérifiez que le serveur est démarré.',
                'error'
            );
        }
    }
    
    /**
     * Met à jour toutes les données du dashboard
     */
    async updateDashboard() {
        try {
            // Récupérer les données en parallèle
            const [stats, threatsData, attackersData] = await Promise.all([
                API.getStats(CONFIG.CHART_HOURS_DEFAULT),
                API.getThreats({ perPage: CONFIG.MAX_FEED_ITEMS }),
                API.getAttackers({ perPage: CONFIG.MAX_ATTACKERS })
            ]);
            
            // Stocker les données
            this.data.stats = stats;
            this.data.threats = threatsData.threats || [];
            this.data.attackers = attackersData.attackers || [];
            
            // Mettre à jour les composants
            this.updateStats(stats);
            this.updateLiveFeed(this.data.threats);
            this.updateCharts();
            this.updateAttackers();
            this.updateMap();
            
            // Détecter les nouvelles menaces
            this.detectNewThreats();
            
            // Mettre à jour l'heure de dernière mise à jour
            this.updateLastUpdate();
            
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
        }
    }
    
    /**
     * Met à jour les statistiques
     */
    updateStats(stats) {
        // Total threats
        this.animateNumber('stat-total-threats', stats.total_threats || 0);
        
        // Unique attackers
        this.animateNumber('stat-unique-attackers', stats.unique_attackers || 0);
        
        // Average risk
        const avgRisk = stats.average_risk_score || 0;
        this.animateNumber('stat-avg-risk', avgRisk, 1);
        
        // Mettre à jour la barre de risque
        this.updateRiskMeter(avgRisk);
        
        // Attack rate (calcul basé sur les dernières heures)
        const attackRate = Math.round((stats.total_threats || 0) / CONFIG.CHART_HOURS_DEFAULT);
        this.animateNumber('stat-attack-rate', attackRate);
        
        // Mettre à jour les tendances
        this.updateTrends(stats);
    }
    
    /**
     * Anime un nombre
     */
    animateNumber(elementId, target, decimals = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const current = parseFloat(element.textContent) || 0;
        const diff = target - current;
        const steps = 20;
        const increment = diff / steps;
        let step = 0;
        
        const animate = () => {
            step++;
            if (step <= steps) {
                const value = current + (increment * step);
                element.textContent = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
                requestAnimationFrame(animate);
            } else {
                element.textContent = decimals > 0 ? target.toFixed(decimals) : target;
            }
        };
        
        if (Math.abs(diff) > 0) {
            animate();
            // Pulse animation
            element.parentElement?.classList.add('pulse');
            setTimeout(() => element.parentElement?.classList.remove('pulse'), 1000);
        }
    }
    
    /**
     * Met à jour la barre de risque
     */
    updateRiskMeter(riskScore) {
        const meter = document.getElementById('risk-meter');
        if (!meter) return;
        
        const percentage = (riskScore / 10) * 100;
        meter.style.width = `${percentage}%`;
        
        // Couleur selon le niveau
        const riskLevel = getRiskLevel(riskScore);
        meter.style.background = riskLevel.color;
        
        // Mettre à jour le label
        const label = document.getElementById('risk-label');
        if (label) {
            label.textContent = riskLevel.label;
            label.style.color = riskLevel.color;
        }
    }
    
    /**
     * Met à jour les tendances
     */
    updateTrends(stats) {
        // Calculer les tendances (simulation pour la démo)
        const trends = {
            threats: Math.random() > 0.5 ? '+' : '-',
            attackers: Math.random() > 0.5 ? '+' : '-',
            risk: Math.random() > 0.5 ? '↑' : '↓'
        };
        
        // Mettre à jour l'affichage
        Object.entries(trends).forEach(([key, trend]) => {
            const element = document.getElementById(`trend-${key}`);
            if (element) {
                element.textContent = trend;
                element.className = trend.includes('+') || trend.includes('↑') ? 'trend-up' : 'trend-down';
            }
        });
    }
    
    /**
     * Met à jour le live feed
     */
    updateLiveFeed(threats) {
        if (!this.components.liveFeed) return;
        
        // Ajouter avec le timezone correct
        const threatsWithCorrectTime = threats.map(threat => ({
            ...threat,
            // S'assurer que le timestamp est bien interprété comme UTC
            timestamp: threat.timestamp.endsWith('Z') ? threat.timestamp : threat.timestamp + 'Z'
        }));
        
        this.components.liveFeed.updateBatch(threatsWithCorrectTime);
    }
    
    /**
     * Met à jour les graphiques
     */
    updateCharts() {
        if (!this.components.charts) return;
        
        this.components.charts.updateAll({
            stats: this.data.stats,
            threats: this.data.threats
        });
    }
    
    /**
     * Met à jour la carte
     */
    updateMap() {
        if (!this.components.worldMap) return;
        
        this.components.worldMap.updateBatch(this.data.threats);
    }
    
    /**
     * Met à jour la liste des attaquants
     */
    updateAttackers() {
        const container = document.getElementById('top-attackers');
        if (!container) return;
        
        container.innerHTML = this.data.attackers.map(attacker => {
            const countryInfo = getCountryInfo(attacker.country || 'XX');
            const riskLevel = getRiskLevel(attacker.total_attacks > 50 ? 8 : 5);
            
            return `
                <div class="attacker-card">
                    <div class="attacker-flag">${countryInfo.flag}</div>
                    <div class="attacker-info">
                        <div class="attacker-ip">${attacker.ip_address}</div>
                        <div class="attacker-stats">
                            <span class="attacker-attacks">${attacker.total_attacks} attaques</span>
                            <span class="attacker-risk" style="color: ${riskLevel.color}">
                                ${attacker.risk_level}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Détecte les nouvelles menaces
     */
    detectNewThreats() {
        const currentCount = this.data.threats.length;
        
        if (this.lastThreatCount > 0 && currentCount > this.lastThreatCount) {
            const newThreats = currentCount - this.lastThreatCount;
            
            // Vérifier les menaces critiques
            const criticalThreats = this.data.threats
                .slice(0, newThreats)
                .filter(t => t.risk_score >= 8);
            
            if (criticalThreats.length > 0) {
                const threat = criticalThreats[0];
                const countryInfo = getCountryInfo(threat.country || 'XX');
                
                this.showNotification(
                    '🚨 Menace Critique Détectée!',
                    `${threat.attack_type} depuis ${countryInfo.flag} ${countryInfo.name}`,
                    'critical'
                );
                
                if (this.soundEnabled) {
                    this.playAlertSound();
                }
            }
        }
        
        this.lastThreatCount = currentCount;
    }
    
    /**
     * Met à jour l'heure de dernière mise à jour
     */
    updateLastUpdate() {
        const element = document.getElementById('last-update');
        if (element) {
            element.textContent = TimezoneUtils.formatTime(new Date());
        }
    }
    
    /**
     * Met à jour le statut de connexion
     */
    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;
        
        if (isOnline) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connecté';
            statusElement.className = 'connection-status online';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Hors ligne';
            statusElement.className = 'connection-status offline';
        }
    }
    
    /**
     * Démarre les mises à jour automatiques
     */
    startAutoUpdates() {
        // Mise à jour principale
        this.updateIntervals.main = setInterval(
            () => this.updateDashboard(),
            CONFIG.UPDATE_INTERVAL
        );
        
        // Événements de changement de plage des graphiques
        document.addEventListener('chartRangeChanged', async (e) => {
            const hours = e.detail.hours;
            this.data.stats = await API.getStats(hours);
            this.updateCharts();
        });
    }
    
    /**
     * Arrête les mises à jour automatiques
     */
    stopAutoUpdates() {
        Object.values(this.updateIntervals).forEach(interval => {
            clearInterval(interval);
        });
    }
    
    /**
     * Attache les event listeners globaux
     */
    attachEventListeners() {
        // Bouton son
        const soundBtn = document.getElementById('toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => this.toggleSound());
        }
        
        // Bouton export
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Bouton plein écran
        const fullscreenBtn = document.getElementById('toggle-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Détails des menaces
        document.addEventListener('threatDetails', (e) => {
            this.showThreatDetails(e.detail);
        });
        
        // Redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            if (this.components.worldMap) {
                this.components.worldMap.resize();
            }
        });
    }
    
    /**
     * Affiche une notification
     */
    showNotification(title, message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-title">${title}</span>
                <span class="notification-close">×</span>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        // Close handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        container.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto-dismiss
        if (CONFIG.NOTIFICATIONS.AUTO_DISMISS) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, CONFIG.NOTIFICATIONS.AUTO_DISMISS);
        }
    }
    
    /**
     * Joue un son d'alerte
     */
    playAlertSound() {
        if (!CONFIG.NOTIFICATIONS.SOUND_ENABLED) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const sound = CONFIG.SOUNDS.CRITICAL;
        oscillator.frequency.value = sound.frequency;
        oscillator.type = 'sine';
        gainNode.gain.value = sound.volume;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + sound.duration / 1000);
    }
    
    /**
     * Bascule le son
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        CONFIG.NOTIFICATIONS.SOUND_ENABLED = this.soundEnabled;
        
        const btn = document.getElementById('toggle-sound');
        if (btn) {
            btn.innerHTML = this.soundEnabled 
                ? '<i class="fas fa-volume-up"></i>' 
                : '<i class="fas fa-volume-mute"></i>';
        }
        
        this.showNotification(
            this.soundEnabled ? '🔊 Son activé' : '🔇 Son désactivé',
            this.soundEnabled ? 'Les alertes sonores sont activées' : 'Les alertes sonores sont désactivées',
            'info'
        );
    }
    
    /**
     * Exporte les données
     */
    async exportData() {
        try {
            const threats = await API.exportThreats();
            
            // Créer le CSV avec timezone correct
            const headers = ['Date/Heure (Paris)', 'IP', 'Pays', 'Service', 'Type d\'Attaque', 'Score de Risque'];
            const rows = threats.map(t => [
                TimezoneUtils.formatDateTime(t.timestamp),
                t.attacker_ip,
                getCountryInfo(t.country || 'XX').name,
                t.service.toUpperCase(),
                t.attack_type,
                t.risk_score
            ]);
            
            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');
            
            // Ajouter BOM pour Excel
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
            
            // Télécharger
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${CONFIG.EXPORT.FILENAME_PREFIX}_${TimezoneUtils.formatDate(new Date()).replace(/\s/g, '_')}.csv`;
            a.click();
            
            window.URL.revokeObjectURL(url);
            
            this.showNotification(
                '✅ Export réussi',
                `${threats.length} menaces exportées`,
                'success'
            );
            
        } catch (error) {
            this.showNotification(
                '❌ Erreur d\'export',
                'Impossible d\'exporter les données',
                'error'
            );
        }
    }
    
    /**
     * Bascule le plein écran
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    /**
     * Affiche les détails d'une menace
     */
    showThreatDetails(threat) {
        // TODO: Implémenter un modal de détails
        console.log('Threat details:', threat);
        
        const countryInfo = getCountryInfo(threat.country || 'XX');
        const message = `
            IP: ${threat.attacker_ip}
            Pays: ${countryInfo.flag} ${countryInfo.name}
            Service: ${threat.service.toUpperCase()}
            Type: ${threat.attack_type}
            Risque: ${threat.risk_score}/10
            Heure: ${TimezoneUtils.formatDateTime(threat.timestamp)}
        `;
        
        this.showNotification('Détails de la menace', message, 'info');
    }
    
    /**
     * Détruit l'application
     */
    destroy() {
        // Arrêter les mises à jour
        this.stopAutoUpdates();
        
        // Détruire les composants
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        // Nettoyer
        this.components = {};
        this.data = {};
    }
}

// Démarrer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.honeypotDashboard = new HoneypotDashboard();
    });
} else {
    window.honeypotDashboard = new HoneypotDashboard();
}

// Export pour les modules
export default HoneypotDashboard;