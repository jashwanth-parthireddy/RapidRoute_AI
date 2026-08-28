"""
Route Scoring & ETA Prediction Models
Gracefully degrades when scikit-learn is not installed.
"""
import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from training.synthetic_data import generate_route_samples

try:
    from sklearn.ensemble import RandomForestRegressor
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False


class RouteScoreModel:
    def __init__(self):
        self.trained = False
        self.model   = None

    def train(self):
        if not _HAS_SKLEARN:
            self.trained = True
            return
        from sklearn.ensemble import RandomForestRegressor
        df = generate_route_samples(3000)
        features = ['distance_km', 'avg_congestion', 'junction_count', 'is_highway', 'is_peak']
        self.model = RandomForestRegressor(n_estimators=120, max_depth=5, random_state=42)
        X = df[features].values
        y = df['ai_score'].values
        self.model.fit(X, y)
        self.trained = True

    def score(self, route: dict) -> float:
        if not self.trained:
            self.train()

        import datetime
        hour    = datetime.datetime.now().hour
        is_peak = int((8 <= hour <= 10) or (17 <= hour <= 20))

        # Heuristic fallback
        if not _HAS_SKLEARN or self.model is None:
            congestion    = route.get('avg_congestion', 50)
            junction_pen  = route.get('junction_count', 4) * 2
            highway_bonus = 10 if route.get('is_highway', 0) else 0
            peak_pen      = 10 if is_peak else 0
            return max(0.0, min(100.0, 100 - (congestion * 0.4) - junction_pen + highway_bonus - peak_pen))

        X = np.array([[
            route.get('distance',       5),
            route.get('avg_congestion', 50),
            route.get('junction_count', 4),
            route.get('is_highway',     0),
            is_peak,
        ]])
        return float(self.model.predict(X)[0])


class ETAModel:
    """Predict ETA in minutes — pure heuristic, no sklearn needed."""

    def predict(self, params: dict) -> float:
        distance_km    = params.get('distance_km', 5.0)
        current_speed  = params.get('current_speed', 0.0)
        junction_count = params.get('junction_count', 3)
        traffic_levels = params.get('traffic_levels', [])
        congestion_pct = params.get('congestion_pct', 40.0)

        if current_speed and current_speed > 0:
            effective_speed = max(5.0, current_speed * (1 - congestion_pct / 200))
        else:
            factor_map = {'low': 1.0, 'medium': 0.75, 'high': 0.5, 'critical': 0.3}
            dominant   = max(set(traffic_levels), key=traffic_levels.count) if traffic_levels else 'medium'
            effective_speed = 40 * factor_map.get(dominant, 0.75)

        base_eta = (distance_km / effective_speed) * 60

        penalty_map = {'low': 0.3, 'medium': 0.8, 'high': 1.5, 'critical': 2.5}
        dominant    = max(set(traffic_levels), key=traffic_levels.count) if traffic_levels else 'medium'
        junction_penalty = junction_count * penalty_map.get(dominant, 0.8)

        return round(base_eta + junction_penalty, 2)


_route_model = RouteScoreModel()
_eta_model   = ETAModel()

def get_route_model() -> RouteScoreModel: return _route_model
def get_eta_model()   -> ETAModel:        return _eta_model
