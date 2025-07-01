// Configuration
const API_URL = 'http://localhost:5000';
const UPDATE_INTERVAL = 5000; // 5 secondes

// Variables globales
let threatsData = [];
let timelineChart, attackTypesChart;
let map;
let markers = [];

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    initializeMap();
    updateDashboard();
    setInterval(updateDashboard, UPDATE_INTERVAL);
    updateTime();
    setInterval(updateTime, 1000);
});

// Mise à jour de l'heure
function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = 
        now.toLocaleString('fr-FR', { 
            weekday: 'short', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
}

// Mise à jour du dashboard
async function updateDashboard() {
    try {
        // Récupérer les stats
        const statsResponse = await fetch(`${API_URL}/api/stats`);
        const stats = await statsResponse.json();
        
        // Récupérer les menaces récentes
        const threatsResponse = await fetch(`${API_URL}/api/threats?per_page=50`);
        const threats = await threatsResponse.json();
        
        // Récupérer les top attaquants
        const attackersResponse = await fetch(`${API_URL}/api/attackers?per_page=10`);
        const attackers = await attackersResponse.json();
        
        // Mettre à jour l'interface
        updateStats(stats);
        updateLiveFeed(threats.threats);
        updateCharts(stats, threats.threats);
        updateTopAttackers(attackers.attackers);
        updateMap(threats.threats);
        
        // Détecter les nouvelles menaces
        detectNewThreats(threats.threats);
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
    }
}

// Mise à jour des statistiques
function updateStats(stats) {
    // Total threats
    const totalThreats = document.getElementById('total-threats');
    const oldValue = parseInt(totalThreats.textContent) || 0;
    totalThreats.textContent = stats.total_threats;
    
    // Animation si augmentation
    if (stats.total_threats > oldValue && oldValue > 0) {
        const card = document.getElementById('total-threats-card');
        card.classList.add('pulse');
        setTimeout(() => card.classList.remove('pulse'), 1000);
        
        // Calculer le changement
        const change = ((stats.total_threats - oldValue) / oldValue * 100).toFixed(0);
        document.getElementById('threats-change').textContent = `+${change}%`;
    }
    
    // Unique attackers
    document.getElementById('unique-attackers').textContent = stats.unique_attackers;
    
    // Risk score
    const avgRisk = stats.average_risk_score || 0;
    document.getElementById('avg-risk-score').textContent = avgRisk.toFixed(1);
    
    // Risk bar
    const riskBar = document.getElementById('risk-bar');
    const riskPercent = (avgRisk / 10) * 100;
    riskBar.style.width = `${riskPercent}%`;
    
    // Couleur selon le niveau
    if (avgRisk < 4) {
        riskBar.style.background = 'var(--success)';
    } else if (avgRisk < 7) {
        riskBar.style.background = 'var(--warning)';
    } else {
        riskBar.style.background = 'var(--danger)';
    }
}

// Initialisation des graphiques
function initializeCharts() {
    // Timeline Chart
    const ctxTimeline = document.getElementById('timelineChart').getContext('2d');
    timelineChart = new Chart(ctxTimeline, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Attacks',
                data: [],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a8b2d1'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a8b2d1'
                    }
                }
            }
        }
    });
    
    // Attack Types Chart
    const ctxTypes = document.getElementById('attackTypesChart').getContext('2d');
    attackTypesChart = new Chart(ctxTypes, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#00d4ff',
                    '#ff006e',
                    '#00ff88',
                    '#ffaa00',
                    '#667eea',
                    '#764ba2'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a8b2d1'
                    }
                }
            }
        }
    });
}

// Mise à jour des graphiques
function updateCharts(stats, threats) {
    // Timeline - Grouper par heure
    const hourlyData = {};
    const now = new Date();
    
    // Initialiser les 24 dernières heures
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now - i * 60 * 60 * 1000);
        const key = hour.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        hourlyData[key] = 0;
    }
    
    // Compter les attaques par heure
    threats.forEach(threat => {
        const date = new Date(threat.timestamp);
        const key = date.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        if (hourlyData[key] !== undefined) {
            hourlyData[key]++;
        }
    });
    
    timelineChart.data.labels = Object.keys(hourlyData);
    timelineChart.data.datasets[0].data = Object.values(hourlyData);
    timelineChart.update();
    
    // Attack Types
    if (stats.top_attack_types && stats.top_attack_types.length > 0) {
        attackTypesChart.data.labels = stats.top_attack_types.map(t => t.type);
        attackTypesChart.data.datasets[0].data = stats.top_attack_types.map(t => t.count);
        attackTypesChart.update();
    }
}

// Initialisation de la carte
function initializeMap() {
    map = L.map('world-map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
}

// Mise à jour de la carte
function updateMap(threats) {
    // Effacer les anciens markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Simuler des localisations pour la démo (normalement on utiliserait une vraie API GeoIP)
    const locations = {
        '172.19.0.1': { lat: 48.8566, lng: 2.3522, country: 'FR', city: 'Paris' },
        '192.168.1.100': { lat: 40.7128, lng: -74.0060, country: 'US', city: 'New York' },
        '10.0.0.50': { lat: 51.5074, lng: -0.1278, country: 'GB', city: 'London' },
        '127.0.0.1': { lat: 45.7640, lng: 4.8357, country: 'FR', city: 'Lyon' }
    };
    
    // Grouper par IP
    const ipCounts = {};
    threats.forEach(threat => {
        ipCounts[threat.attacker_ip] = (ipCounts[threat.attacker_ip] || 0) + 1;
    });
    
    // Créer les markers
    Object.entries(ipCounts).forEach(([ip, count]) => {
        const loc = locations[ip] || {
            lat: Math.random() * 140 - 70,
            lng: Math.random() * 360 - 180,
            country: 'Unknown',
            city: 'Unknown'
        };
        
        const marker = L.circleMarker([loc.lat, loc.lng], {
            radius: Math.min(5 + count * 2, 20),
            fillColor: '#ff006e',
            color: '#00d4ff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.6
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>IP: ${ip}</strong><br>
            Location: ${loc.city}, ${loc.country}<br>
            Attacks: ${count}
        `);
        
        markers.push(marker);
    });
}

// Mise à jour du live feed
function updateLiveFeed(threats) {
    const feedContent = document.getElementById('feed-content');
    feedContent.innerHTML = '';
    
    threats.slice(0, 20).forEach((threat, index) => {
        const item = createFeedItem(threat);
        if (index === 0) item.classList.add('new');
        feedContent.appendChild(item);
    });
}

// Créer un élément de feed
function createFeedItem(threat) {
    const item = document.createElement('div');
    item.className = 'feed-item';
    
    const time = new Date(threat.timestamp).toLocaleTimeString('fr-FR');
    const riskClass = threat.risk_score < 4 ? 'low' : threat.risk_score < 7 ? 'medium' : 'high';
    
    item.innerHTML = `
        <span>${time}</span>
        <span>${threat.attacker_ip}</span>
        <span>${threat.service.toUpperCase()}</span>
        <span>${formatAttackType(threat.attack_type)}</span>
        <span class="risk-badge risk-${riskClass}">${threat.risk_score}/10</span>
    `;
    
    item.onclick = () => showThreatDetails(threat);
    
    return item;
}

// Formatage du type d'attaque
function formatAttackType(type) {
    return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Top attaquants
function updateTopAttackers(attackers) {
    const container = document.getElementById('top-attackers-list');
    container.innerHTML = '';
    
    // Flags par pays (simulation)
    const countryFlags = {
        'FR': '🇫🇷',
        'US': '🇺🇸',
        'GB': '🇬🇧',
        'CN': '🇨🇳',
        'RU': '🇷🇺',
        'DE': '🇩🇪'
    };
    
    attackers.forEach(attacker => {
        const country = ['FR', 'US', 'GB', 'CN', 'RU', 'DE'][Math.floor(Math.random() * 6)];
        const card = document.createElement('div');
        card.className = 'attacker-card';
        
        card.innerHTML = `
            <div class="attacker-info">
                <div class="attacker-flag">${countryFlags[country] || '🌍'}</div>
                <div class="attacker-details">
                    <h4>${attacker.ip_address}</h4>
                    <p>Risk: ${attacker.risk_level} • First seen: ${new Date(attacker.first_seen).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="attack-count">${attacker.total_attacks}</div>
        `;
        
        container.appendChild(card);
    });
}

// Détection des nouvelles menaces
let lastThreatCount = 0;
function detectNewThreats(threats) {
    if (lastThreatCount > 0 && threats.length > lastThreatCount) {
        const newCount = threats.length - lastThreatCount;
        const latestThreat = threats[0];
        
        // Notification pour les menaces critiques
        if (latestThreat.risk_score >= 8) {
            showNotification(
                '🚨 Critical Threat Detected!',
                `${latestThreat.attack_type} from ${latestThreat.attacker_ip}`,
                'critical'
            );
        }
    }
    lastThreatCount = threats.length;
}

// Afficher une notification
function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-title">${title}</span>
            <span class="notification-close" onclick="this.parentElement.parentElement.remove()">×</span>
        </div>
        <div class="notification-message">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove après 5 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Afficher les détails d'une menace
function showThreatDetails(threat) {
    const modal = document.getElementById('threat-modal');
    const details = document.getElementById('threat-details');
    
    details.innerHTML = `
        <p><strong>Timestamp:</strong> ${new Date(threat.timestamp).toLocaleString()}</p>
        <p><strong>Honeypot ID:</strong> ${threat.honeypot_id}</p>
        <p><strong>Service:</strong> ${threat.service.toUpperCase()}</p>
        <p><strong>Attacker IP:</strong> ${threat.attacker_ip}</p>
        <p><strong>Attack Type:</strong> ${formatAttackType(threat.attack_type)}</p>
        <p><strong>Risk Score:</strong> ${threat.risk_score}/10</p>
        <h4>Payload:</h4>
        <pre>${JSON.stringify(threat.payload, null, 2)}</pre>
    `;
    
    modal.style.display = 'block';
}

// Fermer le modal
document.getElementsByClassName('close')[0].onclick = function() {
    document.getElementById('threat-modal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('threat-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Export des données
async function exportData() {
    try {
        // Récupérer toutes les menaces
        const response = await fetch(`${API_URL}/api/threats?per_page=1000`);
        const data = await response.json();
        
        // Convertir en CSV
        const csv = convertToCSV(data.threats);
        
        // Télécharger
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `threats_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        showNotification('Export réussi', `${data.threats.length} menaces exportées`, 'success');
    } catch (error) {
        showNotification('Erreur', 'Impossible d\'exporter les données', 'error');
    }
}

// Convertir en CSV
function convertToCSV(threats) {
    const headers = ['Timestamp', 'IP', 'Service', 'Attack Type', 'Risk Score'];
    const rows = threats.map(t => [
        t.timestamp,
        t.attacker_ip,
        t.service,
        t.attack_type,
        t.risk_score
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
}

// Animation pulse pour les cartes
const style = document.createElement('style');
style.textContent = `
    .pulse {
        animation: pulse-animation 1s ease-in-out;
    }
    
    @keyframes pulse-animation {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);