from __future__ import annotations

from fastapi import APIRouter

from backend.schemas.route import AnomalyEvent
from backend.services.anomaly_service import AnomalyService, reset_routes
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


@router.post("/reset-routes")
async def reset_routes_endpoint() -> dict:
    await reset_routes(manager)
    return {"status": "reset", "message": "All routes restored to initial state"}


@router.get("/demo-stops")
async def get_demo_stops() -> dict:
    """Return available stops per courier for the custom anomaly form."""
    from backend.fixtures.demo_routes import DEMO_ROUTES

    result = {}
    for courier_id, stops in DEMO_ROUTES.items():
        result[courier_id] = [
            {
                "id": s.id,
                "label": s.id.split("_", 1)[1].replace("_", " ").title(),
            }
            for s in stops
        ]
    return result
