#!/usr/bin/env python3
"""
Machine Learning pour détecter les patterns d'attaque anormaux
Utilise l'algorithme Isolation Forest pour la détection d'anomalies
"""

import requests
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json
from datetime import datetime, timedelta
import schedule
import time

class MLThreatDetector:
    def __init__(self, api_url='http://localhost:5000'):
        self.api_url = api_url
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def fetch_threats(self, hours=24):
        """Récupère les menaces des dernières heures"""
        try:
            response = requests.get(f"{self.api_url}/api/threats?per_page=1000")
            if response.status_code == 200:
                threats = response.json()['threats']
                
                # Filtrer par date
                cutoff_time = datetime.utcnow() - timedelta(hours=hours)
                recent_threats = [
                    t for t in threats 
                    if datetime.fromisoformat(t['timestamp']) > cutoff_time
                ]
                
                return recent_threats
        except Exception as e:
            print(f"Erreur lors de la récupération des menaces: {e}")
            return []
    
    def prepare_features(self, threats):
        """Prépare les features pour le ML"""
        if not threats:
            return None
            
        features = []
        
        for threat in threats:
            # Extraire les caractéristiques
            hour = datetime.fromisoformat(threat['timestamp']).hour
            
            # Encoder le service
            service_encoding = {
                'ssh': 0,
                'http': 1,
                'telnet': 2
            }.get(threat['service'], 3)
            
            # Encoder le type d'attaque
            attack_encoding = {
                'brute_force': 0,
                'unauthorized_access': 1,
                'sql_injection': 2,
                'command_injection': 3,
                'path_traversal': 4,
                'reconnaissance': 5
            }.get(threat['attack_type'], 6)
            
            # Extraire l'octet final de l'IP
            ip_parts = threat['attacker_ip'].split('.')
            ip_last_octet = int(ip_parts[-1]) if len(ip_parts) == 4 else 0
            
            # Calculer la longueur du payload
            payload_length = len(json.dumps(threat.get('payload', {})))
            
            feature_vector = [
                hour,                    # Heure de l'attaque
                service_encoding,        # Type de service
                attack_encoding,         # Type d'attaque
                threat['risk_score'],    # Score de risque
                ip_last_octet,          # Dernier octet de l'IP
                payload_length,         # Taille du payload
                threat.get('attacker_port', 0)  # Port source
            ]
            
            features.append(feature_vector)
        
        return np.array(features)
    
    def train_model(self):
        """Entraîne le modèle sur les données historiques"""
        print("🤖 Entraînement du modèle ML...")
        
        threats = self.fetch_threats(hours=168)  # 7 jours
        if not threats:
            print("❌ Pas assez de données pour l'entraînement")
            return False
        
        features = self.prepare_features(threats)
        if features is None or len(features) < 10:
            print("❌ Pas assez de features pour l'entraînement")
            return False
        
        # Normaliser les features
        features_scaled = self.scaler.fit_transform(features)
        
        # Entraîner le modèle
        self.model.fit(features_scaled)
        self.is_trained = True
        
        print(f"✅ Modèle entraîné sur {len(features)} échantillons")
        return True
    
    def detect_anomalies(self):
        """Détecte les anomalies dans les menaces récentes"""
        if not self.is_trained:
            if not self.train_model():
                return []
        
        # Récupérer les menaces de la dernière heure
        recent_threats = self.fetch_threats(hours=1)
        if not recent_threats:
            return []
        
        features = self.prepare_features(recent_threats)
        if features is None:
            return []
        
        # Normaliser et prédire
        features_scaled = self.scaler.transform(features)
        predictions = self.model.predict(features_scaled)
        anomaly_scores = self.model.score_samples(features_scaled)
        
        # Identifier les anomalies
        anomalies = []
        for i, (threat, pred, score) in enumerate(zip(recent_threats, predictions, anomaly_scores)):
            if pred == -1:  # Anomalie détectée
                anomalies.append({
                    'threat': threat,
                    'anomaly_score': float(score),
                    'reason': self.analyze_anomaly(threat, features[i])
                })
        
        return anomalies
    
    def analyze_anomaly(self, threat, features):
        """Analyse pourquoi une menace est considérée comme anormale"""
        reasons = []
        
        hour = features[0]
        if hour < 6 or hour > 22:
            reasons.append("Attaque en dehors des heures normales")
        
        if threat['risk_score'] >= 8:
            reasons.append("Score de risque très élevé")
        
        if features[5] > 1000:  # Payload length
            reasons.append("Payload anormalement grand")
        
        # Vérifier les patterns d'IP
        ip_parts = threat['attacker_ip'].split('.')
        if len(ip_parts) == 4:
            if ip_parts[0] in ['10', '172', '192']:
                reasons.append("IP privée détectée")
        
        return " | ".join(reasons) if reasons else "Pattern inhabituel détecté"
    
    def analyze_attack_patterns(self):
        """Analyse les patterns d'attaque"""
        threats = self.fetch_threats(hours=24)
        if not threats:
            return {}
        
        df = pd.DataFrame(threats)
        
        # Analyser les patterns temporels
        df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
        hourly_pattern = df.groupby('hour').size().to_dict()
        
        # Analyser les séquences d'attaques
        ip_sequences = df.groupby('attacker_ip').apply(
            lambda x: list(x.sort_values('timestamp')['attack_type'])
        ).to_dict()
        
        # Détecter les attaques coordonnées
        time_window = pd.Timedelta(minutes=5)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        coordinated_attacks = []
        
        for i in range(len(df)):
            current_time = df.iloc[i]['timestamp']
            window_attacks = df[
                (df['timestamp'] >= current_time - time_window) &
                (df['timestamp'] <= current_time + time_window)
            ]
            
            if len(window_attacks['attacker_ip'].unique()) > 3:
                coordinated_attacks.append({
                    'time': current_time.isoformat(),
                    'ips': list(window_attacks['attacker_ip'].unique()),
                    'attack_types': list(window_attacks['attack_type'].unique())
                })
        
        return {
            'hourly_pattern': hourly_pattern,
            'attack_sequences': {
                ip: seq for ip, seq in ip_sequences.items() 
                if len(seq) > 5  # IPs avec plus de 5 attaques
            },
            'coordinated_attacks': coordinated_attacks[:5],  # Top 5
            'summary': {
                'peak_hour': max(hourly_pattern, key=hourly_pattern.get) if hourly_pattern else None,
                'most_persistent_attacker': df['attacker_ip'].value_counts().index[0] if len(df) > 0 else None,
                'most_common_pattern': self.find_common_pattern(ip_sequences)
            }
        }
    
    def find_common_pattern(self, sequences):
        """Trouve le pattern d'attaque le plus commun"""
        pattern_count = {}
        
        for seq in sequences.values():
            if len(seq) >= 2:
                # Créer des bi-grammes
                for i in range(len(seq) - 1):
                    pattern = f"{seq[i]} -> {seq[i+1]}"
                    pattern_count[pattern] = pattern_count.get(pattern, 0) + 1
        
        if pattern_count:
            return max(pattern_count, key=pattern_count.get)
        return None
    
    def generate_report(self):
        """Génère un rapport complet"""
        print("\n📊 RAPPORT D'ANALYSE ML")
        print("=" * 50)
        
        # Détecter les anomalies
        anomalies = self.detect_anomalies()
        if anomalies:
            print(f"\n🚨 {len(anomalies)} ANOMALIES DÉTECTÉES:")
            for i, anomaly in enumerate(anomalies[:5]):  # Top 5
                threat = anomaly['threat']
                print(f"\n{i+1}. IP: {threat['attacker_ip']} | Service: {threat['service']}")
                print(f"   Type: {threat['attack_type']} | Score: {threat['risk_score']}")
                print(f"   Raison: {anomaly['reason']}")
                print(f"   Score d'anomalie: {anomaly['anomaly_score']:.3f}")
        else:
            print("\n✅ Aucune anomalie détectée")
        
        # Analyser les patterns
        patterns = self.analyze_attack_patterns()
        
        print("\n📈 ANALYSE DES PATTERNS:")
        if patterns['summary']['peak_hour'] is not None:
            print(f"- Heure de pointe: {patterns['summary']['peak_hour']}h")
        if patterns['summary']['most_persistent_attacker']:
            print(f"- Attaquant le plus persistant: {patterns['summary']['most_persistent_attacker']}")
        if patterns['summary']['most_common_pattern']:
            print(f"- Pattern le plus commun: {patterns['summary']['most_common_pattern']}")
        
        if patterns['coordinated_attacks']:
            print(f"\n🎯 ATTAQUES COORDONNÉES POSSIBLES:")
            for attack in patterns['coordinated_attacks'][:3]:
                print(f"- {attack['time']}: {len(attack['ips'])} IPs simultanées")
        
        print("\n" + "=" * 50)
        
        # Retourner les résultats pour l'API
        return {
            'anomalies': anomalies,
            'patterns': patterns,
            'timestamp': datetime.utcnow().isoformat()
        }


def run_ml_analysis():
    """Fonction principale pour l'analyse ML périodique"""
    detector = MLThreatDetector()
    
    # Analyse initiale
    detector.generate_report()
    
    # Programmer des analyses régulières
    schedule.every(15).minutes.do(detector.generate_report)
    schedule.every(1).hours.do(detector.train_model)
    
    print("\n🤖 ML Detector démarré - Analyse toutes les 15 minutes")
    
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    # Pour tester directement
    detector = MLThreatDetector()
    detector.generate_report()