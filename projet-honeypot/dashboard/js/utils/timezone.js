/**
 * Utilitaire de gestion des timezones
 * Convertit UTC vers Europe/Paris et gère l'affichage des dates/heures
 */

export const TimezoneUtils = {
    // Configuration
    userTimezone: 'Europe/Paris',
    
    // Options de formatage par défaut
    timeOptions: {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    },
    
    dateOptions: {
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    },
    
    dateTimeOptions: {
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    },
    
    /**
     * Convertit un timestamp UTC en date locale
     * @param {string} timestamp - Timestamp UTC
     * @returns {Date} Date en timezone locale
     */
    utcToLocal(timestamp) {
        // Si le timestamp n'a pas de 'Z' à la fin, l'ajouter pour indiquer UTC
        if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
            timestamp += 'Z';
        }
        return new Date(timestamp);
    },
    
    /**
     * Formate l'heure seulement
     * @param {string|Date} timestamp 
     * @returns {string} Heure formatée (HH:MM:SS)
     */
    formatTime(timestamp) {
        const date = timestamp instanceof Date ? timestamp : this.utcToLocal(timestamp);
        return date.toLocaleTimeString('fr-FR', this.timeOptions);
    },
    
    /**
     * Formate la date seulement
     * @param {string|Date} timestamp 
     * @returns {string} Date formatée
     */
    formatDate(timestamp) {
        const date = timestamp instanceof Date ? timestamp : this.utcToLocal(timestamp);
        return date.toLocaleDateString('fr-FR', this.dateOptions);
    },
    
    /**
     * Formate date et heure complètes
     * @param {string|Date} timestamp 
     * @returns {string} Date et heure formatées
     */
    formatDateTime(timestamp) {
        const date = timestamp instanceof Date ? timestamp : this.utcToLocal(timestamp);
        return date.toLocaleString('fr-FR', this.dateTimeOptions);
    },
    
    /**
     * Formate un timestamp relatif (il y a X minutes)
     * @param {string|Date} timestamp 
     * @returns {string} Temps relatif
     */
    formatRelative(timestamp) {
        const date = timestamp instanceof Date ? timestamp : this.utcToLocal(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'à l\'instant';
        if (diffMin < 60) return `il y a ${diffMin}min`;
        if (diffHour < 24) return `il y a ${diffHour}h`;
        if (diffDay < 7) return `il y a ${diffDay}j`;
        
        return this.formatDate(date);
    },
    
    /**
     * Obtient l'heure actuelle formatée
     * @returns {object} Heure et date actuelles
     */
    getCurrentTime() {
        const now = new Date();
        return {
            time: this.formatTime(now),
            date: this.formatDate(now),
            datetime: this.formatDateTime(now),
            timestamp: now.toISOString()
        };
    },
    
    /**
     * Groupe les données par heure (pour les graphiques)
     * @param {Array} data - Données avec timestamps
     * @param {string} timestampField - Nom du champ timestamp
     * @param {number} hours - Nombre d'heures à afficher
     * @returns {object} Données groupées par heure
     */
    groupByHour(data, timestampField = 'timestamp', hours = 24) {
        const hourlyData = {};
        const now = new Date();
        
        // Initialiser toutes les heures
        for (let i = hours - 1; i >= 0; i--) {
            const hour = new Date(now - i * 60 * 60 * 1000);
            const key = hour.toLocaleTimeString('fr-FR', { 
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '00',
                hour12: false
            });
            hourlyData[key] = 0;
        }
        
        // Compter les éléments par heure
        data.forEach(item => {
            const date = this.utcToLocal(item[timestampField]);
            const key = date.toLocaleTimeString('fr-FR', { 
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '00',
                hour12: false
            });
            if (hourlyData[key] !== undefined) {
                hourlyData[key]++;
            }
        });
        
        return hourlyData;
    },
    
    /**
     * Détermine si c'est la nuit (pour le thème automatique)
     * @returns {boolean} True si c'est la nuit
     */
    isNightTime() {
        const hour = new Date().getHours();
        return hour < 6 || hour >= 22;
    },
    
    /**
     * Obtient le décalage UTC actuel
     * @returns {string} Décalage (ex: "+01:00")
     */
    getTimezoneOffset() {
        const now = new Date();
        const parisTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
        const utcTime = new Date(now.toLocaleString("en-US", {timeZone: "UTC"}));
        const offset = (parisTime - utcTime) / (60 * 60 * 1000);
        const sign = offset >= 0 ? '+' : '-';
        const hours = Math.floor(Math.abs(offset));
        const minutes = Math.floor((Math.abs(offset) % 1) * 60);
        return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
};

// Export par défaut
export default TimezoneUtils;