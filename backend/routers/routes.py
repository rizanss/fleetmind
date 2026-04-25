from __future__ import annotations

from fastapi import APIRouter

from backend.schemas.route import RouteResponse
from backend.services.anomaly_service import get_current_routes

router = APIRouter()


@router.get("/current-route")
async def current_route() -> dict:
    routes_map, last_sequence_id = get_current_routes()
    return {
        "routes": [r.model_dump() for r in routes_map.values()],
        "last_sequence_id": last_sequence_id,
    }
