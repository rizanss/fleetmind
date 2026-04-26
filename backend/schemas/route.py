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


class RouteEventContext(BaseModel):
    anomaly_type: str  # "road_closure" or "cancellation"
    affected_stop_id: str
    affected_stop_name: str
    previous_order: int
    new_order: int | None  # None when stop was cancelled
    total_stops_before: int
    total_stops_after: int


class RouteResponse(BaseModel):
    courier_id: str
    optimized_route: list[RoutePoint]
    recalc_duration_ms: int
    anomaly_id: str
    event_context: RouteEventContext | None = None


class WebSocketMessage(BaseModel):
    event: Literal["route_updated"]
    sequence_id: int
    payload: RouteResponse


class LinearTicketPayload(BaseModel):
    title: str
    description: str
    anomaly_id: str
