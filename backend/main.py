from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Fleetmind API", version="1.0.0")

_frontend_origins = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in _frontend_origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _warmup_ortools() -> None:
    # Trigger OR-Tools C++ initialization to eliminate cold-start latency during demo.
    # Replaced by TSPService.warmup() once the service is wired in FLT-9.
    try:
        from ortools.constraint_solver import pywrapcp, routing_enums_pb2  # noqa: F401

        manager = pywrapcp.RoutingIndexManager(3, 1, 0)
        routing = pywrapcp.RoutingModel(manager)
        transit = routing.RegisterTransitCallback(lambda f, t: 1)
        routing.SetArcCostEvaluatorOfAllVehicles(transit)
        params = pywrapcp.DefaultRoutingSearchParameters()
        params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        routing.SolveWithParameters(params)
        logger.info("OR-Tools warm-up complete")
    except Exception as exc:
        logger.warning("OR-Tools warm-up failed: %s", exc)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# WebSocket endpoint — manager wired in FLT-10
@app.websocket("/ws/route-updates")
async def ws_route_updates(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
