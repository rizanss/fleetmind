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
    try:
        from backend.services.tsp_service import TSPService
        TSPService.warmup()
        logger.info("OR-Tools warm-up complete")
    except Exception as exc:
        logger.warning("OR-Tools warm-up failed: %s", exc)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.websocket("/ws/route-updates")
async def ws_route_updates(websocket: WebSocket) -> None:
    from backend.services.ws_manager import manager
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
