"""
AnomalyService: orchestrates the anomaly flow.
  1. Re-compute routes for all affected couriers (sync, critical path)
  2. Broadcast WebSocketMessage to all connected clients (sync, critical path)
  3. Create Linear audit trail ticket (async, fire-and-forget)
"""
from __future__ import annotations

import asyncio
import logging
import uuid

from backend.fixtures.demo_routes import DEMO_ROUTES
from backend.schemas.route import (
    AnomalyEvent,
    AnomalyEventType,
    LinearTicketPayload,
    RouteEventContext,
    RoutePoint,
    RouteResponse,
    WebSocketMessage,
)
from backend.services.linear_client import LinearClient, ProductionLinearClient
from backend.services.tsp_service import TSPService
from backend.services.ws_manager import WebSocketManager

logger = logging.getLogger(__name__)

# In-memory route state — updated after every rerouting event
_current_routes: dict[str, RouteResponse] = {}
_last_anomaly_id: str = ""


class AnomalyService:
    def __init__(
        self,
        ws_manager: WebSocketManager,
        linear_client: LinearClient | None = None,
    ) -> None:
        self._ws = ws_manager
        self._linear = linear_client or ProductionLinearClient()

    async def handle(self, event: AnomalyEvent) -> tuple[str, int]:
        """
        Process an anomaly event end-to-end.

        Returns:
            (anomaly_id, affected_courier_count)
        """
        global _current_routes, _last_anomaly_id

        anomaly_id = str(uuid.uuid4())
        _last_anomaly_id = anomaly_id

        # Use the live route state so previous anomalies (e.g. cancellations) are
        # preserved — never re-introduce stops that were already removed.
        current_stops = _get_current_stops()

        # Identify which couriers are actually affected by this anomaly.
        # A courier is affected only if at least one of its stops contains
        # the affected_point_id substring in its id.
        affected_couriers: dict[str, list[RoutePoint]] = {}
        for courier_id, stops in current_stops.items():
            has_affected_stop = any(
                event.affected_point_id in stop.id for stop in stops
            )
            if has_affected_stop:
                affected_couriers[courier_id] = stops

        # Collect affected stop IDs from all affected couriers
        affected_stop_ids = [
            stop.id
            for stops in affected_couriers.values()
            for stop in stops
            if event.affected_point_id in stop.id
        ]

        # cancellation → remove the stop entirely (package no longer needs delivery)
        # road_closure → keep the stop but penalize its distances to simulate a detour
        excluded_edges: list[str] = []
        penalized_stops: list[str] = []
        if event.type == AnomalyEventType.cancellation:
            excluded_edges = affected_stop_ids
        else:
            penalized_stops = affected_stop_ids

        # Re-compute route only for affected couriers (sync — critical path)
        new_routes: dict[str, RouteResponse] = {}
        for courier_id, stops in affected_couriers.items():
            result = TSPService.recompute(
                stops=stops,
                excluded_edges=excluded_edges,
                penalized_stops=penalized_stops,
                anomaly_id=anomaly_id,
                courier_id=courier_id,
            )

            # Attach event context so the frontend can render a human-readable log.
            # Find the affected stop in the pre-recompute list to get its previous order,
            # then look it up in the result to get its new order (None if cancelled).
            affected_stop: RoutePoint | None = next(
                (s for s in stops if event.affected_point_id in s.id), None
            )
            if affected_stop is not None:
                stop_after: RoutePoint | None = next(
                    (s for s in result.optimized_route if s.id == affected_stop.id), None
                )
                # "c1_sudirman" → "Sudirman", "c3_thamrin_barat" → "Thamrin Barat"
                name_raw = affected_stop.id.split("_", 1)[-1]
                stop_name = name_raw.replace("_", " ").title()

                ctx = RouteEventContext(
                    anomaly_type=event.type.value,
                    affected_stop_id=affected_stop.id,
                    affected_stop_name=stop_name,
                    previous_order=affected_stop.order,
                    new_order=stop_after.order if stop_after is not None else None,
                    total_stops_before=len(stops),
                    total_stops_after=len(result.optimized_route),
                )
                result = RouteResponse(
                    courier_id=result.courier_id,
                    optimized_route=result.optimized_route,
                    recalc_duration_ms=result.recalc_duration_ms,
                    anomaly_id=result.anomaly_id,
                    event_context=ctx,
                )

            new_routes[courier_id] = result

        # Merge with existing routes — unaffected couriers keep their current state
        if _current_routes:
            merged = dict(_current_routes)
            merged.update(new_routes)
            _current_routes = merged
        else:
            # First event, build initial for unaffected couriers too
            _current_routes = _build_initial_routes()
            _current_routes.update(new_routes)

        affected_count = len(new_routes)

        # Broadcast ONLY the updated routes via WebSocket (sync — critical path)
        for courier_id, route_response in new_routes.items():
            msg = WebSocketMessage(
                event="route_updated",
                sequence_id=self._ws.sequence_id + 1,
                payload=route_response,
            )
            await self._ws.broadcast(msg)

        # Fire-and-forget Linear ticket (async — non-blocking)
        affected_ids = list(new_routes.keys())
        ticket = LinearTicketPayload(
            title=f"[ANOMALY] {event.type.value} — {event.affected_point_id}",
            description=(
                f"**Anomaly type:** {event.type.value}\n"
                f"**Affected point:** {event.affected_point_id}\n"
                f"**Timestamp:** {event.timestamp.isoformat()}\n"
                f"**Anomaly ID:** {anomaly_id}\n"
                f"**Affected couriers:** {affected_count} ({', '.join(affected_ids)})\n\n"
                "_Auto-generated by Fleetmind_"
            ),
            anomaly_id=anomaly_id,
        )
        asyncio.create_task(self._create_linear_ticket(ticket))

        logger.info(
            "Anomaly handled: id=%s type=%s affected_couriers=%s",
            anomaly_id,
            event.type.value,
            affected_ids,
        )
        return anomaly_id, affected_count

    async def _create_linear_ticket(self, payload: LinearTicketPayload) -> None:
        """Wrapper so exceptions from LinearClient never escape the task."""
        try:
            await self._linear.create_ticket(payload)
        except Exception as exc:
            logger.error("Unhandled Linear error (anomaly=%s): %s", payload.anomaly_id, exc)


def _get_current_stops() -> dict[str, list]:
    """
    Returns the live stop list per courier.
    Prefers _current_routes (post-anomaly state) over DEMO_ROUTES so that
    stops already removed by cancellations are never re-introduced.
    """
    if _current_routes:
        return {cid: r.optimized_route for cid, r in _current_routes.items()}
    return dict(DEMO_ROUTES)


def get_current_routes() -> tuple[dict[str, RouteResponse], int]:
    """Returns current route state and the last sequence_id."""
    from backend.services.ws_manager import manager
    return _current_routes or _build_initial_routes(), manager.sequence_id


async def reset_routes(ws_manager: WebSocketManager) -> dict[str, RouteResponse]:
    """Reset all routes to initial state and broadcast to all clients."""
    global _current_routes, _last_anomaly_id

    _current_routes = _build_initial_routes()
    _last_anomaly_id = ""

    # Broadcast all initial routes so connected clients update immediately
    for courier_id, route_response in _current_routes.items():
        msg = WebSocketMessage(
            event="route_updated",
            sequence_id=ws_manager.sequence_id + 1,
            payload=route_response,
        )
        await ws_manager.broadcast(msg)

    logger.info("Routes reset to initial state")
    return _current_routes


def _build_initial_routes() -> dict[str, RouteResponse]:
    """Initial demo routes before any anomaly is triggered."""
    routes = {}
    for courier_id, stops in DEMO_ROUTES.items():
        routes[courier_id] = RouteResponse(
            courier_id=courier_id,
            optimized_route=stops,
            recalc_duration_ms=0,
            anomaly_id="initial",
        )
    return routes
