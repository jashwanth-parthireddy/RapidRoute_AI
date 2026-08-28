"""
Junction Delay & Priority Prediction Model
Gracefully degrades when scikit-learn is not installed.
"""
import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from training.synthetic_data import generate_junction_traffic_samples

try:
    from sklearn.ensemble import GradientBoostingRegressor
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False

PRIORITY_LABELS = ['critical', 'high', 'medium', 'low']


class JunctionPriorityModel:
    def __init__(self):
        self.trained = False
        self.model = None

    def train(self):
        if not _HAS_SKLEARN:
            # Mark as "trained" with heuristic mode
            self.trained = True
            return
        from sklearn.ensemble import GradientBoostingRegressor
        df = generate_junction_traffic_samples(4000)
        features = ['congestion_pct', 'vehicle_count', 'avg_speed', 'traffic_level_enc',
                    'signal_count', 'is_peak', 'is_weekend', 'hour']
        X = df[features].values
        y = df['delay_minutes'].values
        self.model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
        self.model.fit(X, y)
        self.trained = True

    def predict_delay(self, junction: dict, hour: int = 12, is_peak: bool = False) -> float:
        if not self.trained:
            self.train()

        traffic_enc = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
        level       = traffic_enc.get(junction.get('traffic_level', 'medium'), 1)
        congestion  = junction.get('congestion_pct', 50)

        # Heuristic fallback (when sklearn unavailable)
        if not _HAS_SKLEARN or self.model is None:
            base = congestion / 100 * 5
            peak_bonus = 2.0 if is_peak else 0.0
            signal_pen = junction.get('signal_count', 4) * 0.3
            return round(base + peak_bonus + signal_pen, 2)

        X = np.array([[
            congestion,
            junction.get('vehicle_count', 300),
            junction.get('avg_speed', 25),
            level,
            junction.get('signal_count', 4),
            int(is_peak),
            0,
            hour,
        ]])
        return float(self.model.predict(X)[0])

    def prioritize(self, junctions: list, ambulance_eta_minutes: float = 10) -> list:
        if not self.trained:
            self.train()

        import datetime
        hour    = datetime.datetime.now().hour
        is_peak = (8 <= hour <= 10) or (17 <= hour <= 20)
        result  = []

        for j in junctions:
            delay = self.predict_delay(j, hour=hour, is_peak=is_peak)
            eta   = j.get('eta_to_junction', ambulance_eta_minutes)

            if eta <= 3:
                priority = 'critical'
            elif eta <= 7:
                priority = 'high'
            elif eta <= 12:
                priority = 'medium'
            else:
                priority = 'low'

            result.append({
                **j,
                'predicted_delay_minutes': round(delay, 2),
                'priority': priority,
                'risk_score': round(min(100, (delay / (eta + 0.1)) * 30 +
                    (4 - ['low', 'medium', 'high', 'critical'].index(
                        j.get('traffic_level', 'low'))) * 10), 1),
            })

        result.sort(key=lambda x: x.get('eta_to_junction', 999))
        return result


_model = JunctionPriorityModel()

def get_junction_model() -> JunctionPriorityModel:
    if not _model.trained:
        _model.train()
    return _model
