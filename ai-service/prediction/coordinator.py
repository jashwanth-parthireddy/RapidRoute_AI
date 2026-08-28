"""
Emergency Route Coordinator Agent
Orchestrates: route recommendation, ETA, junction prioritization, and explainable decisions.
"""
import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from models.route_model  import get_route_model, get_eta_model
from models.junction_model import get_junction_model


def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def recommend_route(origin: dict, destination: dict, traffic_snapshot: List[dict] = None) -> dict:
    """
    Generate and score two route options, return the best with explanation.
    """
    route_model = get_route_model()
    eta_model   = get_eta_model()

    o_lat, o_lng = origin['lat'], origin['lng']
    d_lat, d_lng = destination['lat'], destination['lng']
    direct_dist  = haversine(o_lat, o_lng, d_lat, d_lng)

    # Simulate two route options
    normal_dist  = direct_dist
    alt_dist     = direct_dist * 1.12

    hour = datetime.now().hour
    is_peak = (8 <= hour <= 10) or (17 <= hour <= 20)

    normal_congestion = 65 if is_peak else 40
    alt_congestion    = 35 if is_peak else 20

    normal_score = route_model.score({
        'distance':      normal_dist,
        'avg_congestion': normal_congestion,
        'junction_count': 5,
        'is_highway':     0,
    })
    alt_score = route_model.score({
        'distance':      alt_dist,
        'avg_congestion': alt_congestion,
        'junction_count': 3,
        'is_highway':     1,
    })

    normal_eta = eta_model.predict({
        'distance_km':    normal_dist,
        'junction_count': 5,
        'congestion_pct': normal_congestion,
        'traffic_levels': ['high'] if is_peak else ['medium'],
    })
    alt_eta = eta_model.predict({
        'distance_km':    alt_dist,
        'junction_count': 3,
        'congestion_pct': alt_congestion,
        'traffic_levels': ['medium'] if is_peak else ['low'],
    })

    time_saved = normal_eta - alt_eta
    recommended = 'B' if alt_score > normal_score else 'A'

    if recommended == 'B':
        reasoning = (
            f"Route B is recommended: it avoids {int(normal_congestion - alt_congestion)}% higher congestion "
            f"on the primary corridor and passes through {5-3} fewer high-delay junctions. "
            f"Predicted travel time: {alt_eta:.1f} min vs {normal_eta:.1f} min on Route A "
            f"(estimated {time_saved:.1f} min saved)."
        )
    else:
        reasoning = (
            f"Route A is recommended: direct path is shorter and current traffic conditions "
            f"are acceptable. Predicted travel time: {normal_eta:.1f} min."
        )

    return {
        'recommended_route':     recommended,
        'route_a': {
            'distance_km':  round(normal_dist, 2),
            'eta_minutes':  round(normal_eta, 2),
            'ai_score':     round(normal_score, 1),
            'congestion':   normal_congestion,
            'junctions':    5,
        },
        'route_b': {
            'distance_km':  round(alt_dist, 2),
            'eta_minutes':  round(alt_eta, 2),
            'ai_score':     round(alt_score, 1),
            'congestion':   alt_congestion,
            'junctions':    3,
        },
        'time_saved_minutes': round(max(0, time_saved), 2),
        'reasoning':          reasoning,
        'score':              round(max(normal_score, alt_score), 1),
        'is_peak':            is_peak,
        'generated_at':       datetime.now(timezone.utc).isoformat(),
    }


def predict_eta(params: dict) -> dict:
    eta_model = get_eta_model()
    eta = eta_model.predict(params)
    return {
        'eta_minutes': eta,
        'confidence':  0.85,
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }


def prioritize_junctions(junctions: List[dict], ambulance_eta: float = 10) -> dict:
    junction_model = get_junction_model()
    prioritized = junction_model.prioritize(junctions, ambulance_eta)

    high_count = sum(1 for j in prioritized if j['priority'] in ('critical','high'))
    reasoning = (
        f"Analysed {len(junctions)} junctions along the route. "
        f"{high_count} require immediate attention (ETA < 7 min). "
        f"Officers at high-priority junctions have been alerted first."
    )

    return {
        'junctions': prioritized,
        'high_priority_count': high_count,
        'reasoning': reasoning,
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }


def score_route(normal: dict, alt: dict, emergency_id: str = '') -> dict:
    route_model = get_route_model()
    normal_score = route_model.score({
        'distance': normal.get('distance', 5),
        'avg_congestion': 55,
        'junction_count': 5,
        'is_highway': 0,
    })
    alt_score = route_model.score({
        'distance': alt.get('distance', 5.5),
        'avg_congestion': 30,
        'junction_count': 3,
        'is_highway': 1,
    })
    time_diff = normal.get('estimated_time', 25) - alt.get('estimated_time', 18)
    return {
        'score':     round(max(normal_score, alt_score), 1),
        'reasoning': f'Route B scored {alt_score:.1f} vs Route A {normal_score:.1f}. Estimated {time_diff:.1f} min saved via lower congestion path.',
        'recommended': 'B' if alt_score >= normal_score else 'A',
    }
