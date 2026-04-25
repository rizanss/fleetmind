"""Integration tests for POST /simulate-anomaly and AnomalyService."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app
from backend.schemas.route import AnomalyEvent, AnomalyEventType, LinearTicketPayload
from backend.services.anomaly_service import AnomalyService
from backend.services.linear_client import MockLinearClient
from backend.services.ws_manager import WebSocketManager


@pytest.mark.asyncio
async def test_simulate_anomaly_returns_expected_shape():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/simulate-anomaly",
            json={
                "type": "road_closure",
                "affected_point_id": "sudirman",
                "timestamp": "2026-04-25T10:00:00Z",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processing"
    assert data["affected_couriers"] == 3
    assert "anomaly_id" in data


@pytest.mark.asyncio
async def test_anomaly_service_with_mock_linear_client():
    """MockLinearClient receives a call with the correct anomaly_id."""
    mock_linear = MockLinearClient()
    ws = WebSocketManager()
    service = AnomalyService(ws_manager=ws, linear_client=mock_linear)

    event = AnomalyEvent(
        type=AnomalyEventType.road_closure,
        affected_point_id="sudirman",
        timestamp="2026-04-25T10:00:00Z",
    )
    anomaly_id, affected = await service.handle(event)
    # Yield to event loop so the fire-and-forget create_task can run
    import asyncio
    await asyncio.sleep(0)

    assert affected == 3
    assert len(mock_linear.calls) == 1
    assert mock_linear.calls[0].anomaly_id == anomaly_id


@pytest.mark.asyncio
async def test_anomaly_service_linear_failure_does_not_propagate():
    """When LinearClient raises, the anomaly flow still completes without error."""
    failing_linear = MockLinearClient(raise_on_call=True)
    ws = WebSocketManager()
    service = AnomalyService(ws_manager=ws, linear_client=failing_linear)

    event = AnomalyEvent(
        type=AnomalyEventType.cancellation,
        affected_point_id="c1_semanggi",
        timestamp="2026-04-25T10:05:00Z",
    )
    # Must not raise
    anomaly_id, affected = await service.handle(event)
    assert anomaly_id
    assert affected == 3
