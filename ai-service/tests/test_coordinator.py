"""
AI Service Unit Tests — coordinator, route model, eta model, junction model
Run with: pytest ai-service/tests/
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from prediction.coordinator import recommend_route, predict_eta, prioritize_junctions, haversine


class TestHaversine:
    def test_same_point_is_zero(self):
        assert haversine(17.44, 78.50, 17.44, 78.50) == pytest.approx(0, abs=1e-5)

    def test_distance_symmetric(self):
        d1 = haversine(17.44, 78.45, 17.42, 78.47)
        d2 = haversine(17.42, 78.47, 17.44, 78.45)
        assert d1 == pytest.approx(d2, rel=1e-6)

    def test_hyderabad_junctions_reasonable(self):
        # Ameerpet to Koti (~5-8 km)
        d = haversine(17.4373, 78.4483, 17.3858, 78.4849)
        assert 4 < d < 9


class TestRouteRecommendation:
    def test_returns_recommended_route(self):
        result = recommend_route(
            origin={'lat': 17.4373, 'lng': 78.4483},
            destination={'lat': 17.4399, 'lng': 78.4983},
        )
        assert 'recommended_route' in result
        assert result['recommended_route'] in ('A', 'B')

    def test_has_reasoning(self):
        result = recommend_route(
            origin={'lat': 17.44, 'lng': 78.45},
            destination={'lat': 17.42, 'lng': 78.47},
        )
        assert 'reasoning' in result
        assert len(result['reasoning']) > 20

    def test_time_saved_non_negative(self):
        result = recommend_route(
            origin={'lat': 17.44, 'lng': 78.45},
            destination={'lat': 17.42, 'lng': 78.47},
        )
        assert result['time_saved_minutes'] >= 0

    def test_route_a_and_b_present(self):
        result = recommend_route(
            origin={'lat': 17.44, 'lng': 78.45},
            destination={'lat': 17.40, 'lng': 78.50},
        )
        assert 'route_a' in result
        assert 'route_b' in result
        assert result['route_a']['eta_minutes'] > 0
        assert result['route_b']['eta_minutes'] > 0


class TestETAPrediction:
    def test_basic_prediction(self):
        result = predict_eta({
            'distance_km': 5,
            'junction_count': 3,
            'congestion_pct': 40,
            'traffic_levels': ['medium'],
        })
        assert result['eta_minutes'] > 0
        assert result['eta_minutes'] < 60

    def test_higher_congestion_increases_eta(self):
        low_result  = predict_eta({'distance_km': 5, 'junction_count': 2, 'congestion_pct': 10, 'traffic_levels': ['low']})
        high_result = predict_eta({'distance_km': 5, 'junction_count': 2, 'congestion_pct': 90, 'traffic_levels': ['critical']})
        assert high_result['eta_minutes'] > low_result['eta_minutes']

    def test_longer_distance_more_time(self):
        short = predict_eta({'distance_km': 3,  'junction_count': 2, 'congestion_pct': 40, 'traffic_levels': ['medium']})
        long  = predict_eta({'distance_km': 15, 'junction_count': 2, 'congestion_pct': 40, 'traffic_levels': ['medium']})
        assert long['eta_minutes'] > short['eta_minutes']


class TestJunctionPrioritization:
    def get_sample_junctions(self):
        return [
            {'id': 'j1', 'name': 'Ameerpet', 'traffic_level': 'critical', 'congestion_pct': 92, 'vehicle_count': 580, 'avg_speed': 10, 'signal_count': 6, 'eta_to_junction': 2},
            {'id': 'j2', 'name': 'Begumpet', 'traffic_level': 'high',     'congestion_pct': 70, 'vehicle_count': 420, 'avg_speed': 18, 'signal_count': 4, 'eta_to_junction': 5},
            {'id': 'j3', 'name': 'HITEC City','traffic_level': 'low',     'congestion_pct': 20, 'vehicle_count': 150, 'avg_speed': 40, 'signal_count': 2, 'eta_to_junction': 15},
        ]

    def test_returns_all_junctions(self):
        result = prioritize_junctions(self.get_sample_junctions(), ambulance_eta=10)
        assert len(result['junctions']) == 3

    def test_nearest_junction_first(self):
        result = prioritize_junctions(self.get_sample_junctions(), ambulance_eta=10)
        junctions = result['junctions']
        assert junctions[0]['eta_to_junction'] <= junctions[-1]['eta_to_junction']

    def test_closest_is_critical(self):
        result = prioritize_junctions(self.get_sample_junctions(), ambulance_eta=10)
        closest = result['junctions'][0]
        assert closest['priority'] in ('critical', 'high')

    def test_far_junction_is_low_priority(self):
        result = prioritize_junctions(self.get_sample_junctions(), ambulance_eta=10)
        far = next(j for j in result['junctions'] if j['id'] == 'j3')
        assert far['priority'] in ('low', 'medium')

    def test_has_high_priority_count(self):
        result = prioritize_junctions(self.get_sample_junctions(), ambulance_eta=10)
        assert 'high_priority_count' in result
        assert result['high_priority_count'] >= 1

    def test_has_reasoning(self):
        result = prioritize_junctions(self.get_sample_junctions(), ambulance_eta=10)
        assert 'reasoning' in result
        assert len(result['reasoning']) > 10
