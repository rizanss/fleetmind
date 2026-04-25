from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel


class RoutePoint(BaseModel):
    id: str
    lat: float
    lng: float
    order: int


class AnomalyEventType(str, Enum):
    road_closure = "road_closure"
    cancellation = "cancellation"


class AnomalyEvent(BaseModel):
    type: AnomalyEventType
    affected_point_id: str
    timestamp: datetime


class RouteResponse(BaseModel):
    optimized_route: list[RoutePoint]
    recalc_duration_ms: int
    anomaly_id: str


class WebSocketMessage(BaseModel):
    event: Literal["route_updated"]
    sequence_id: int
    payload: RouteResponse


class LinearTicketPayload(BaseModel):
    title: str
    description: str
    anomaly_id: str
