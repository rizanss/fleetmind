"""
WebSocket connection manager.
Maintains the set of active connections and owns the global sequence_id counter.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Set

from fastapi import WebSocket
from fastapi.websockets import WebSocketState

from backend.schemas.route import WebSocketMessage

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._sequence_id: int = 0

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        logger.debug("WebSocket connected. Active connections: %d", len(self._connections))

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        logger.debug("WebSocket disconnected. Active connections: %d", len(self._connections))

    async def broadcast(self, message: WebSocketMessage) -> None:
        """
        Send message to all active connections.
        Increments sequence_id before sending.
        Dead or slow clients are removed silently — they never block others.
        """
        self._sequence_id += 1
        payload = message.model_dump_json()

        dead: list[WebSocket] = []

        async def _send(ws: WebSocket) -> None:
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_text(payload)
            except Exception as exc:
                logger.debug("Removing dead WebSocket connection: %s", exc)
                dead.append(ws)

        # Fire all sends concurrently — a slow client does not delay the others
        await asyncio.gather(*[_send(ws) for ws in list(self._connections)], return_exceptions=True)

        for ws in dead:
            self._connections.discard(ws)

    @property
    def sequence_id(self) -> int:
        return self._sequence_id

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Singleton instance shared across the application
manager = WebSocketManager()
