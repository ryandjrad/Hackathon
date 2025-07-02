/**
 * Composant Charts
 * Gère l'affichage et la mise à jour des graphiques
 */

import { TimezoneUtils } from '../utils/timezone.js';
import { CONFIG, getAttackTypeInfo, getRiskLevel } from '../config.js';

export class Charts {
    constructor(timelineId, typesId, trendsId) {
        this.charts = {
            timeline: null,
            types: null,
            trends: null
        };
        this.elements = {
            timeline: document.getElementById(timelineId),
            types: document.getElementById(typesId),
            trends: document.getElementById(trendsId)
        };
        this.currentRange = CONFIG.CHART_HOURS_DEFAULT;
        this.init();
    }
    
    /**
     * Initialise les graphiques
     */
    init() {
        this.createTimelineChart();
        this.createTypesChart();
        this.createTrendsChart();
        this.attachEventListeners();
    }
    
    /**
     * Crée le graphique timeline
     */
    createTimelineChart() {
        if (!this.elements.timeline) return;
        
        const ctx = this.elements.timeline.getContext('2d');
        
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Attaques',
                    data: [],
                    borderColor: CONFIG.CHART_COLORS[0],
                    backgroundColor: `${CONFIG.CHART_COLORS[0]}20`,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: CONFIG.CHART_COLORS[0],
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: CONFIG.CHART_COLORS[0],
                        bodyColor: '#e4e8ff',
                        borderColor: CONFIG.CHART_COLORS[0],
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        callbacks: {
                            title: (tooltipItems) => {
                                return `${tooltipItems[0].label}`;
                            },
                            label: (context) => {
                                return `Attaques: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            color: '#a8b2d1',
                            font: { size: 11 }
                        },
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: { 
                            color: '#a8b2d1',
                            font: { size: 11 },
                            maxRotation: 0
                        },
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    /**
     * Crée le graphique des types d'attaques
     */
    createTypesChart() {
        if (!this.elements.types) return;
        
        const ctx = this.elements.types.getContext('2d');
        
        this.charts.types = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: CONFIG.CHART_COLORS,
                    borderWidth: 2,
                    borderColor: '#0a0e27',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a8b2d1',
                            padding: 15,
                            font: { size: 11 },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const meta = chart.getDatasetMeta(0);
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        
                                        return {
                                            text: `${label} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: meta.data[i].hidden,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#00d4ff',
                        bodyColor: '#e4e8ff',
                        borderColor: '#00d4ff',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    /**
     * Crée le graphique des tendances
     */
    createTrendsChart() {
        if (!this.elements.trends) return;
        
        const ctx = this.elements.trends.getContext('2d');
        
        this.charts.trends = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Faible',
                        data: [],
                        backgroundColor: CONFIG.RISK_LEVELS.LOW.color,
                        stack: 'risk'
                    },
                    {
                        label: 'Moyen',
                        data: [],
                        backgroundColor: CONFIG.RISK_LEVELS.MEDIUM.color,
                        stack: 'risk'
                    },
                    {
                        label: 'Élevé',
                        data: [],
                        backgroundColor: CONFIG.RISK_LEVELS.HIGH.color,
                        stack: 'risk'
                    },
                    {
                        label: 'Critique',
                        data: [],
                        backgroundColor: CONFIG.RISK_LEVELS.CRITICAL.color,
                        stack: 'risk'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        ticks: { 
                            color: '#a8b2d1',
                            font: { size: 11 }
                        },
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { 
                            color: '#a8b2d1',
                            font: { size: 11 }
                        },
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#a8b2d1',
                            font: { size: 11 },
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#00d4ff',
                        bodyColor: '#e4e8ff',
                        borderColor: '#00d4ff',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    /**
     * Attache les event listeners
     */
    attachEventListeners() {
        // Range buttons
        document.querySelectorAll('[data-chart-range]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = parseInt(e.target.dataset.chartRange);
                this.updateRange(range);
                
                // Update active state
                document.querySelectorAll('[data-chart-range]').forEach(b => 
                    b.classList.remove('active')
                );
                e.target.classList.add('active');
            });
        });
        
        // Chart type toggle
        document.querySelectorAll('[data-chart-toggle]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartName = e.target.dataset.chartToggle;
                this.toggleChartType(chartName);
            });
        });
    }
    
    /**
     * Met à jour les données de la timeline
     * @param {Array} threats 
     */
    updateTimeline(threats) {
        if (!this.charts.timeline) return;
        
        const hourlyData = TimezoneUtils.groupByHour(threats, 'timestamp', this.currentRange);
        
        this.charts.timeline.data.labels = Object.keys(hourlyData);
        this.charts.timeline.data.datasets[0].data = Object.values(hourlyData);
        
        // Animation smooth
        this.charts.timeline.update('active');
    }
    
    /**
     * Met à jour les types d'attaques
     * @param {object} stats 
     */
    updateTypes(stats) {
        if (!this.charts.types || !stats.top_attack_types) return;
        
        const labels = stats.top_attack_types.map(t => {
            const info = getAttackTypeInfo(t.type);
            return `${info.icon} ${info.label}`;
        });
        
        const data = stats.top_attack_types.map(t => t.count);
        
        this.charts.types.data.labels = labels;
        this.charts.types.data.datasets[0].data = data;
        this.charts.types.update('active');
    }
    
    /**
     * Met à jour les tendances de risque
     * @param {Array} threats 
     */
    updateTrends(threats) {
        if (!this.charts.trends) return;
        
        // Grouper par heure et niveau de risque
        const hourlyRisks = {};
        const hours = 12; // Dernières 12 heures pour les tendances
        const now = new Date();
        
        // Initialiser
        for (let i = hours - 1; i >= 0; i--) {
            const hour = new Date(now - i * 60 * 60 * 1000);
            const key = hour.toLocaleTimeString('fr-FR', { 
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '00',
                hour12: false
            });
            hourlyRisks[key] = { low: 0, medium: 0, high: 0, critical: 0 };
        }
        
        // Compter
        threats.forEach(threat => {
            const date = TimezoneUtils.utcToLocal(threat.timestamp);
            const hoursSinceNow = (now - date) / (60 * 60 * 1000);
            
            if (hoursSinceNow <= hours) {
                const key = date.toLocaleTimeString('fr-FR', { 
                    timeZone: 'Europe/Paris',
                    hour: '2-digit',
                    minute: '00',
                    hour12: false
                });
                
                if (hourlyRisks[key]) {
                    const level = getRiskLevel(threat.risk_score);
                    if (threat.risk_score <= 3) hourlyRisks[key].low++;
                    else if (threat.risk_score <= 6) hourlyRisks[key].medium++;
                    else if (threat.risk_score <= 8) hourlyRisks[key].high++;
                    else hourlyRisks[key].critical++;
                }
            }
        });
        
        // Mettre à jour le graphique
        const labels = Object.keys(hourlyRisks);
        this.charts.trends.data.labels = labels;
        this.charts.trends.data.datasets[0].data = labels.map(k => hourlyRisks[k].low);
        this.charts.trends.data.datasets[1].data = labels.map(k => hourlyRisks[k].medium);
        this.charts.trends.data.datasets[2].data = labels.map(k => hourlyRisks[k].high);
        this.charts.trends.data.datasets[3].data = labels.map(k => hourlyRisks[k].critical);
        
        this.charts.trends.update('active');
    }
    
    /**
     * Change la plage temporelle
     * @param {number} hours 
     */
    updateRange(hours) {
        this.currentRange = hours;
        // Déclencher un événement pour recharger les données
        const event = new CustomEvent('chartRangeChanged', { detail: { hours } });
        document.dispatchEvent(event);
    }
    
    /**
     * Change le type de graphique
     * @param {string} chartName 
     */
    toggleChartType(chartName) {
        const chart = this.charts[chartName];
        if (!chart) return;
        
        if (chart.config.type === 'doughnut') {
            chart.config.type = 'bar';
        } else if (chart.config.type === 'bar') {
            chart.config.type = 'line';
        } else if (chart.config.type === 'line') {
            chart.config.type = 'doughnut';
        }
        
        chart.update();
    }
    
    /**
     * Met à jour tous les graphiques
     * @param {object} data 
     */
    updateAll(data) {
        if (data.threats) {
            this.updateTimeline(data.threats);
            this.updateTrends(data.threats);
        }
        
        if (data.stats) {
            this.updateTypes(data.stats);
        }
    }
    
    /**
     * Détruit les graphiques
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}

// Export par défaut
export default Charts;