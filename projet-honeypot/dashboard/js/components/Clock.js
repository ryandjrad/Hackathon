/**
 * Composant Clock
 * Affiche l'horloge temps réel avec timezone correct
 */

import { TimezoneUtils } from '../utils/timezone.js';
import { CONFIG } from '../config.js';

export class Clock {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.elements = {};
        this.interval = null;
        this.init();
    }
    
    /**
     * Initialise le composant
     */
    init() {
        this.render();
        this.start();
    }
    
    /**
     * Génère le HTML du composant
     */
    render() {
        this.container.innerHTML = `
            <div class="clock-widget">
                <div class="clock-main">
                    <div class="clock-time" id="clock-time">--:--:--</div>
                    <div class="clock-timezone">Paris (UTC${TimezoneUtils.getTimezoneOffset()})</div>
                </div>
                <div class="clock-date" id="clock-date">-- --- ----</div>
            </div>
        `;
        
        // Stocker les références
        this.elements.time = document.getElementById('clock-time');
        this.elements.date = document.getElementById('clock-date');
    }
    
    /**
     * Démarre l'horloge
     */
    start() {
        this.update();
        this.interval = setInterval(() => this.update(), CONFIG.CLOCK_UPDATE_INTERVAL);
    }
    
    /**
     * Arrête l'horloge
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    
    /**
     * Met à jour l'affichage
     */
    update() {
        const current = TimezoneUtils.getCurrentTime();
        
        if (this.elements.time) {
            this.elements.time.textContent = current.time;
            this.animate(this.elements.time);
        }
        
        if (this.elements.date) {
            this.elements.date.textContent = current.date;
        }
    }
    
    /**
     * Animation subtile lors de la mise à jour
     */
    animate(element) {
        element.style.opacity = '0.7';
        setTimeout(() => {
            element.style.opacity = '1';
        }, 100);
    }
    
    /**
     * Détruit le composant
     */
    destroy() {
        this.stop();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// CSS spécifique au composant
const styles = `
<style>
.clock-widget {
    background: rgba(0, 212, 255, 0.1);
    border: 1px solid rgba(0, 212, 255, 0.3);
    border-radius: 12px;
    padding: 0.75rem 1.5rem;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

.clock-widget:hover {
    background: rgba(0, 212, 255, 0.15);
    transform: translateY(-2px);
}

.clock-main {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
}

.clock-time {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--accent-primary);
    letter-spacing: 1px;
    transition: opacity 0.2s ease;
}

.clock-timezone {
    font-size: 0.75rem;
    color: var(--text-secondary);
    opacity: 0.8;
}

.clock-date {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

/* Animation des chiffres */
@keyframes pulse-number {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

.clock-time.pulse {
    animation: pulse-number 0.5s ease;
}

/* Mode responsive */
@media (max-width: 768px) {
    .clock-widget {
        padding: 0.5rem 1rem;
    }
    
    .clock-time {
        font-size: 1.2rem;
    }
    
    .clock-main {
        flex-direction: column;
        gap: 0.25rem;
    }
}
</style>
`;

// Injecter les styles si pas déjà présents
if (!document.getElementById('clock-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'clock-styles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export par défaut
export default Clock;