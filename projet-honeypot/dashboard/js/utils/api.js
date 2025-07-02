/**
 * Gestionnaire centralisé des appels API
 * Gère les requêtes, le cache et la gestion d'erreurs
 */

import { CONFIG } from '../config.js';

class APIManager {
    constructor() {
        this.baseURL = CONFIG.API_URL;
        this.cache = new Map();
        this.requestQueue = [];
        this.isOnline = true;
        this.callbacks = {
            onError: null,
            onOffline: null,
            onOnline: null
        };
    }
    
    /**
     * Effectue une requête GET avec gestion d'erreur et cache
     * @param {string} endpoint 
     * @param {object} params 
     * @param {boolean} useCache 
     * @returns {Promise<any>}
     */
    async get(endpoint, params = {}, useCache = true) {
        const url = this.buildURL(endpoint, params);
        const cacheKey = url.toString();
        
        // Vérifier le cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(CONFIG.API_TIMEOUT)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Mettre en cache
            if (useCache) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }
            
            this.setOnlineStatus(true);
            return data;
            
        } catch (error) {
            this.handleError(error, endpoint);
            throw error;
        }
    }
    
    /**
     * Effectue une requête POST
     * @param {string} endpoint 
     * @param {object} data 
     * @returns {Promise<any>}
     */
    async post(endpoint, data) {
        const url = this.buildURL(endpoint);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(CONFIG.API_TIMEOUT)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.setOnlineStatus(true);
            return await response.json();
            
        } catch (error) {
            this.handleError(error, endpoint);
            throw error;
        }
    }
    
    /**
     * Construit l'URL complète avec les paramètres
     * @param {string} endpoint 
     * @param {object} params 
     * @returns {URL}
     */
    buildURL(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        return url;
    }
    
    /**
     * Gère les erreurs
     * @param {Error} error 
     * @param {string} endpoint 
     */
    handleError(error, endpoint) {
        console.error(`API Error on ${endpoint}:`, error);
        
        if (error.name === 'AbortError' || error.message.includes('NetworkError')) {
            this.setOnlineStatus(false);
        }
        
        if (this.callbacks.onError) {
            this.callbacks.onError(error, endpoint);
        }
    }
    
    /**
     * Met à jour le statut de connexion
     * @param {boolean} isOnline 
     */
    setOnlineStatus(isOnline) {
        const wasOnline = this.isOnline;
        this.isOnline = isOnline;
        
        if (!wasOnline && isOnline && this.callbacks.onOnline) {
            this.callbacks.onOnline();
        } else if (wasOnline && !isOnline && this.callbacks.onOffline) {
            this.callbacks.onOffline();
        }
    }
    
    /**
     * Enregistre un callback
     * @param {string} event 
     * @param {Function} callback 
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }
    
    /**
     * Vide le cache
     */
    clearCache() {
        this.cache.clear();
    }
    
    // === MÉTHODES SPÉCIFIQUES À L'API ===
    
    /**
     * Récupère les statistiques
     * @param {number} hours 
     * @returns {Promise<object>}
     */
    async getStats(hours = 24) {
        return this.get('/api/stats', { hours });
    }
    
    /**
     * Récupère les menaces
     * @param {object} filters 
     * @returns {Promise<object>}
     */
    async getThreats(filters = {}) {
        const params = {
            page: filters.page || 1,
            per_page: filters.perPage || 50,
            service: filters.service,
            attack_type: filters.attackType,
            attacker_ip: filters.attackerIp,
            start_date: filters.startDate,
            end_date: filters.endDate
        };
        
        return this.get('/api/threats', params);
    }
    
    /**
     * Récupère une menace spécifique
     * @param {number} id 
     * @returns {Promise<object>}
     */
    async getThreat(id) {
        return this.get(`/api/threats/${id}`);
    }
    
    /**
     * Récupère les profils d'attaquants
     * @param {object} filters 
     * @returns {Promise<object>}
     */
    async getAttackers(filters = {}) {
        const params = {
            page: filters.page || 1,
            per_page: filters.perPage || 20,
            risk_level: filters.riskLevel
        };
        
        return this.get('/api/attackers', params);
    }
    
    /**
     * Envoie une alerte de test
     * @param {string} message 
     * @returns {Promise<object>}
     */
    async sendTestAlert(message) {
        return this.post('/api/alerts/test', { message });
    }
    
    /**
     * Vérifie la santé de l'API
     * @returns {Promise<boolean>}
     */
    async checkHealth() {
        try {
            const response = await this.get('/health', {}, false);
            return response.status === 'healthy';
        } catch {
            return false;
        }
    }
    
    /**
     * Exporte les données en CSV
     * @param {object} filters 
     * @returns {Promise<Array>}
     */
    async exportThreats(filters = {}) {
        const data = await this.getThreats({ ...filters, perPage: 1000 });
        return data.threats;
    }
}

// Instance unique
const API = new APIManager();

// Export
export { API };
export default API;