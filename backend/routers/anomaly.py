from __future__ import annotations

from fastapi import APIRouter

from backend.schemas.route import AnomalyEvent
from backend.services.anomaly_service import AnomalyService
from backend.services.ws_manager import manager

router = APIRouter()

_service = AnomalyService(ws_manager=manager)


@router.post("/simulate-anomaly")
async def simulate_anomaly(event: AnomalyEvent) -> dict:
    anomaly_id, affected_couriers = await _service.handle(event)
    return {
        "anomaly_id": anomaly_id,
        "affected_couriers": affected_couriers,
        "status": "processing",
    }
