"""Unit tests for GET /current-route."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.mark.asyncio
async def test_current_route_initial_state():
    """Before any anomaly, returns initial demo routes for 3 couriers."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/current-route")

    assert response.status_code == 200
    data = response.json()
    assert "routes" in data
    assert "last_sequence_id" in data
    assert isinstance(data["routes"], list)
    assert len(data["routes"]) == 3  # 3 demo couriers


@pytest.mark.asyncio
async def test_current_route_response_schema():
    """Each route in the response has the expected RouteResponse fields."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/current-route")

    data = response.json()
    for route in data["routes"]:
        assert "courier_id" in route
        assert "optimized_route" in route
        assert "recalc_duration_ms" in route
        assert "anomaly_id" in route
        for stop in route["optimized_route"]:
            assert "id" in stop
            assert "lat" in stop
            assert "lng" in stop
            assert "order" in stop
