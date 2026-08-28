"""
Synthetic Traffic Dataset Generator for RapidRoute AI
Generates realistic traffic patterns for Hyderabad junctions.
pandas is optional — falls back to a lightweight dict-based DataFrame shim.
"""
import numpy as np
from typing import List, Dict, Any

try:
    import pandas as pd
    _HAS_PANDAS = True
except ImportError:
    _HAS_PANDAS = False

class _SeriesShim:
    """Wraps a single numpy array to expose a .values property, like a pandas Series."""
    def __init__(self, arr):
        self._arr = arr
    @property
    def values(self):
        return self._arr
    def __len__(self):
        return len(self._arr)
    def __iter__(self):
        return iter(self._arr)
    def __getitem__(self, idx):
        return self._arr[idx]

class _SimpleDFShim:
    """Minimal pandas-compatible shim used when pandas is not installed."""
    def __init__(self, data: dict):
        self._data = data
        self.columns = list(data.keys())
    def __getitem__(self, keys):
        if isinstance(keys, list):
            return _SimpleDFShim({k: self._data[k] for k in keys})
        # Single column — return a Series-like object with .values
        return _SeriesShim(self._data[keys])
    @property
    def values(self):
        import numpy as np
        cols = list(self._data.values())
        return np.column_stack(cols)
    def head(self, n=5):
        return {k: v[:n] for k, v in self._data.items()}
    def __len__(self):
        return len(next(iter(self._data.values())))
    def __repr__(self):
        return str(self.head())

def _make_df(data: dict):
    if _HAS_PANDAS:
        import pandas as pd
        return pd.DataFrame(data)
    return _SimpleDFShim(data)

TRAFFIC_LEVELS = ['low', 'medium', 'high', 'critical']
LEVEL_MAP = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}

def generate_junction_traffic_samples(n_samples: int = 5000):
    """Generate synthetic traffic records for junction delay prediction."""
    rng = np.random.default_rng(42)

    hours = rng.integers(0, 24, size=n_samples)
    day_of_week = rng.integers(0, 7, size=n_samples)

    # Peak hours: 8-10am, 5-8pm
    peak = ((hours >= 8) & (hours <= 10)) | ((hours >= 17) & (hours <= 20))
    weekend = day_of_week >= 5

    base_congestion = rng.uniform(10, 40, n_samples)
    congestion = np.where(peak, base_congestion + rng.uniform(30, 55, n_samples), base_congestion)
    congestion = np.where(weekend, congestion * 0.7, congestion)
    congestion = np.clip(congestion, 0, 100)

    vehicle_count = (congestion / 100 * 600 + rng.normal(0, 30, n_samples)).clip(50, 650).astype(int)
    avg_speed = np.clip(60 - congestion * 0.5 + rng.normal(0, 5, n_samples), 5, 60)

    traffic_level_idx = np.digitize(congestion, bins=[25, 50, 75]).clip(0, 3)
    traffic_level = [TRAFFIC_LEVELS[int(i)] for i in traffic_level_idx]

    signal_count = rng.choice([2, 4, 6], n_samples)
    junction_type = rng.choice(['roundabout', 'signalized', 'flyover'], n_samples)

    # Target: predicted delay in minutes
    delay = (
        (congestion / 100) * 5 +
        signal_count * 0.3 +
        rng.uniform(0, 2, n_samples) +
        np.where(peak, 2.0, 0.0)
    ).clip(0, 10)

    return _make_df({
        'hour': hours,
        'day_of_week': day_of_week,
        'congestion_pct': congestion.round(1),
        'vehicle_count': vehicle_count,
        'avg_speed': avg_speed.round(1),
        'traffic_level': traffic_level,
        'traffic_level_enc': traffic_level_idx,
        'signal_count': signal_count,
        'is_peak': peak.astype(int),
        'is_weekend': weekend.astype(int),
        'delay_minutes': delay.round(2),
    })


def generate_route_samples(n_samples: int = 3000):
    """Generate synthetic route scoring data."""
    rng = np.random.default_rng(42)

    distance_km     = rng.uniform(2, 20, n_samples)
    avg_congestion  = rng.uniform(10, 90, n_samples)
    junction_count  = rng.integers(1, 10, n_samples)
    is_highway      = rng.choice([0, 1], n_samples, p=[0.6, 0.4])
    time_of_day     = rng.integers(0, 24, n_samples)
    peak            = ((time_of_day >= 8) & (time_of_day <= 10)) | ((time_of_day >= 17) & (time_of_day <= 20))

    # ETA in minutes
    base_speed = np.where(is_highway, 55, 35)
    traffic_factor = 1 + (avg_congestion / 100) * 1.5
    eta = (distance_km / (base_speed / traffic_factor)) * 60 + junction_count * rng.uniform(0.5, 2, n_samples)
    eta = eta + np.where(peak, rng.uniform(2, 8, n_samples), 0)

    # Score: lower is better (0-100)
    score = 100 - (
        (avg_congestion / 100) * 40 +
        (junction_count / 10) * 20 +
        np.where(is_highway, -10, 0) +
        np.where(peak, 10, 0) +
        (eta / 60) * 30
    )
    score = score.clip(0, 100)

    return _make_df({
        'distance_km':    distance_km.round(2),
        'avg_congestion': avg_congestion.round(1),
        'junction_count': junction_count,
        'is_highway':     is_highway,
        'is_peak':        peak.astype(int),
        'eta_minutes':    eta.round(2),
        'ai_score':       score.round(1),
    })


if __name__ == '__main__':
    traffic_df = generate_junction_traffic_samples()
    route_df   = generate_route_samples()
    print(f'Traffic samples: {len(traffic_df)} | Route samples: {len(route_df)}')
    print(traffic_df.head(3))
    print(route_df.head(3))
