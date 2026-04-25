"""Unit tests for TSPService — uses hardcoded Jakarta fixture data."""
from __future__ import annotations

import time

import pytest

from backend.fixtures.demo_routes import COURIER_1_STOPS, COURIER_2_STOPS, DEMO_ROUTES
from backend.schemas.route import RoutePoint
from backend.services.tsp_service import TSPService


def test_reroute_on_road_closure():
    """Blocking a stop (road closure) produces a valid shorter route."""
    stops = COURIER_1_STOPS
    original_count = len(stops)
    excluded = ["c1_sudirman"]

    result = TSPService.recompute(stops, excluded_edges=excluded, anomaly_id="test-closure")

    assert result.anomaly_id == "test-closure"
    assert len(result.optimized_route) == original_count - 1
    # Excluded stop must not appear in result
    result_ids = {s.id for s in result.optimized_route}
    assert "c1_sudirman" not in result_ids
    # All remaining stops accounted for
    expected_ids = {s.id for s in stops if s.id not in excluded}
    assert result_ids == expected_ids
    # Orders are sequential starting at 0
    orders = [s.order for s in result.optimized_route]
    assert orders == list(range(len(result.optimized_route)))


def test_reroute_on_cancellation():
    """Removing a stop (cancellation) produces a valid shorter route."""
    stops = COURIER_2_STOPS
    cancelled_stop = "c2_blok_m"
    excluded = [cancelled_stop]

    result = TSPService.recompute(stops, excluded_edges=excluded, anomaly_id="test-cancel")

    assert len(result.optimized_route) == len(stops) - 1
    result_ids = {s.id for s in result.optimized_route}
    assert cancelled_stop not in result_ids


def test_solver_completes_within_2000ms():
    """TSP solve over all 3 courier routes combined must complete in < 2000ms."""
    all_stops = [s for route in DEMO_ROUTES.values() for s in route]
    excluded = ["c1_sudirman", "c2_sudirman", "c3_sudirman"]

    t = time.perf_counter()
    result = TSPService.recompute(all_stops, excluded_edges=excluded)
    elapsed_ms = (time.perf_counter() - t) * 1000

    assert elapsed_ms < 2000, f"Solver too slow: {elapsed_ms:.0f}ms"
    assert result.recalc_duration_ms >= 0


def test_empty_exclusion_returns_all_stops():
    stops = COURIER_1_STOPS
    result = TSPService.recompute(stops, excluded_edges=[])
    assert len(result.optimized_route) == len(stops)


def test_all_stops_excluded_returns_empty():
    stops = COURIER_1_STOPS[:2]
    excluded = [s.id for s in stops]
    result = TSPService.recompute(stops, excluded_edges=excluded)
    assert result.optimized_route == []


def test_single_stop_returns_immediately():
    stops = [RoutePoint(id="only", lat=-6.2, lng=106.8, order=0)]
    result = TSPService.recompute(stops, excluded_edges=[])
    assert len(result.optimized_route) == 1
    assert result.recalc_duration_ms == 0
