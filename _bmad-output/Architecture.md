# Fleetmind — Architecture Document

**Version:** 1.0  
**Date:** 2026-04-25  
**Author:** Riza Nursyah

---

## 1. System Overview

Fleetmind is a three-tier system: a Next.js frontend, a FastAPI backend, and an async Linear integration layer. The critical path (anomaly → rerouting → UI update) is fully synchronous and deterministic. The audit trail (Linear ticket creation) is async and non-blocking by design.

```
┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Vercel)                          │
│   Next.js 16+  │  Leaflet Map  │  WebSocket Client  │  Tailwind  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP + WebSocket
┌───────────────────────────▼──────────────────────────────────────┐
│                       BACKEND (Railway)                          │
│   FastAPI  │  OR-Tools TSP Engine  │  WebSocket Manager          │
└───────────────┬──────────────────────────────┬───────────────────┘
                │ sync (critical path)         │ async (non-blocking)
     ┌──────────▼──────────┐        ┌──────────▼──────────┐
     │   OR-Tools Solver   │        │    Linear Client    │
     │  (Pure Python/C++)  │        │  (MCP / REST API)   │
     └─────────────────────┘        └─────────────────────┘
```

---

## 2. Request Flows

### 2.1 Anomaly Simulation — Critical Path

```
User clicks "Simulate Anomaly" button
    │
    ▼
POST /simulate-anomaly { AnomalyEvent }
    │
    ▼
FastAPI: validate input, identify affected couriers
    │
    ▼
TSPService.recompute(affected_routes, excluded_edge)
    │  [sync, target < 2s]
    ▼
OR-Tools returns RouteResponse[]
    │
    ├──── asyncio.create_task(linear_client.create_ticket(...))  ← fire and forget
    │
    ▼
WebSocketManager.broadcast(WebSocketMessage)
    │
    ▼
Frontend receives WebSocketMessage
    │
    ├──── Leaflet map animates route change
    └──── Audit trail panel renders anomaly details + recalc_duration_ms
```

### 2.2 Linear Audit Trail — Async Path

```
After TSP result is ready
    │
    ▼
asyncio.create_task(linear_client.create_ticket(LinearTicketPayload))
    │  [background task, never awaited by request handler]
    ▼
try:
    Linear API call
    → success: ticket created with URGENT priority
except Exception:
    → silent-fail: log to server log only, no UI impact
```

### 2.3 WebSocket Reconnection Flow

```
Client detects disconnect
    │
    ▼
Exponential backoff reconnect (attempts: 3, base: 1s)
    │
    ▼
On reconnect: check sequence_id of last received message
    │
    ├── sequence_id matches server? → resume normally
    └── sequence_id gap detected?  → GET /current-route → re-render map
```

---

## 3. Data Contracts

All five contracts are defined before any implementation begins. TypeScript interfaces and Pydantic models must be semantically identical.

### RoutePoint

```typescript
// frontend/lib/types.ts
interface RoutePoint {
  id: string
  lat: number
  lng: number
  order: number
}
```

```python
# backend/schemas/route.py
class RoutePoint(BaseModel):
    id: str
    lat: float
    lng: float
    order: int
```

### AnomalyEvent

```typescript
interface AnomalyEvent {
  type: "road_closure" | "cancellation"
  affected_point_id: string
  timestamp: string  // ISO8601
}
```

```python
class AnomalyEventType(str, Enum):
    road_closure = "road_closure"
    cancellation = "cancellation"

class AnomalyEvent(BaseModel):
    type: AnomalyEventType
    affected_point_id: str
    timestamp: datetime
```

### RouteResponse

```typescript
interface RouteResponse {
  optimized_route: RoutePoint[]
  recalc_duration_ms: number
  anomaly_id: string
}
```

```python
class RouteResponse(BaseModel):
    optimized_route: list[RoutePoint]
    recalc_duration_ms: int
    anomaly_id: str
```

### WebSocketMessage

```typescript
interface WebSocketMessage {
  event: "route_updated"
  sequence_id: number
  payload: RouteResponse
}
```

```python
class WebSocketMessage(BaseModel):
    event: Literal["route_updated"]
    sequence_id: int
    payload: RouteResponse
```

### LinearTicketPayload

```typescript
interface LinearTicketPayload {
  title: string
  description: string
  anomaly_id: string
}
```

```python
class LinearTicketPayload(BaseModel):
    title: str
    description: str
    anomaly_id: str
```

---

## 4. API Reference

### POST `/simulate-anomaly`

Triggers anomaly simulation. Recomputes all affected routes synchronously, broadcasts via WebSocket, creates Linear ticket asynchronously.

**Request body:** `AnomalyEvent`

**Response:**
```json
{
  "anomaly_id": "uuid",
  "affected_couriers": 3,
  "status": "processing"
}
```

**Side effects:** WebSocket broadcast (sync), Linear ticket creation (async)

---

### GET `/current-route`

Returns current route state for all couriers. Used by frontend after WebSocket reconnection to recover missed updates.

**Response:**
```json
{
  "routes": [RouteResponse],
  "last_sequence_id": 42
}
```

---

### WebSocket `/ws/route-updates`

Persistent connection. Server pushes `WebSocketMessage` after every recalculation.

- Server maintains monotonically increasing `sequence_id` per session
- Client detects gap in `sequence_id` → calls `GET /current-route`

---

## 5. Component Details

### `TSPService` — `backend/services/tsp_service.py`

- Wraps Google OR-Tools CP-SAT routing solver
- **Stateless:** pure function — `recompute(stops: list[RoutePoint], excluded_edges: list[str]) -> RouteResponse`
- Measures `recalc_duration_ms` via `time.perf_counter()` wrapping the solver call
- **Warm-up:** One dummy TSP call executed at FastAPI startup via `@app.on_event("startup")` to eliminate C++ library cold-start latency

### `WebSocketManager` — `backend/services/ws_manager.py`

- Maintains a set of active WebSocket connections
- Thread-safe broadcast to all connected clients
- Owns the global monotonically increasing `sequence_id` counter
- Handles connect/disconnect lifecycle

### `LinearClient` — `backend/services/linear_client.py`

- **Interface:** `async def create_ticket(payload: LinearTicketPayload) -> None`
- **Production implementation:** Linear MCP or REST API
- **Mock implementation:** for unit and integration tests
- All exceptions caught silently — logs to structured logger, never surfaces to caller

### `useRouteUpdates` — `frontend/hooks/useRouteUpdates.ts`

- Opens WebSocket connection to `/ws/route-updates`
- Reconnect strategy: exponential backoff, max 3 attempts
- Gap detection: compares incoming `sequence_id` against last received; calls `GET /current-route` on gap
- Exposes: `{ routes, lastUpdate, isConnected, connectionError }`

### `AnomalyService` — `backend/services/anomaly_service.py`

- Orchestrates the anomaly flow: validates event, calls `TSPService`, calls `WebSocketManager.broadcast`, fires Linear task
- Dependency-injects `LinearClient` (enables mock substitution in tests)

---

## 6. Infrastructure

| Component | Platform | Configuration |
|---|---|---|
| Frontend | Vercel | Auto-deploy from `main` branch |
| Backend | Railway | WebSocket support enabled; `PORT` env var |
| Map Tiles | OpenStreetMap via Leaflet | No API key required |
| Linear | Linear MCP | `LINEAR_API_KEY` env var; async only |

---

## 7. Non-Functional Requirements

| NFR | Requirement | Implementation |
|---|---|---|
| TSP cold start | Eliminated | Warm-up call at FastAPI startup |
| Recalculation speed | < 2s for demo dataset | OR-Tools, small N (3 couriers, ~10 stops) |
| WebSocket resilience | Auto-reconnect | Exponential backoff, 3 attempts, state recovery via GET |
| Linear failure isolation | Zero UI impact | Silent-fail `try/except`, server-only logging |
| Demo transparency | Speed metric visible in UI | `recalculation_time_ms` displayed in dashboard audit panel |

---

## 8. File Structure

```
fleetmind/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── Map/
│   │   │   ├── FleetMap.tsx            # Leaflet map wrapper
│   │   │   └── RouteLayer.tsx          # Route polyline rendering
│   │   ├── Dashboard/
│   │   │   ├── AnomalyPanel.tsx        # Simulate button + status
│   │   │   └── AuditTrail.tsx          # Recalc metrics + history
│   │   └── ui/                         # Shared UI components
│   ├── hooks/
│   │   └── useRouteUpdates.ts          # WebSocket + reconnect hook
│   └── lib/
│       └── types.ts                    # All shared TypeScript interfaces
│
├── backend/
│   ├── main.py                         # FastAPI app, startup events
│   ├── routers/
│   │   ├── anomaly.py                  # POST /simulate-anomaly
│   │   └── routes.py                   # GET /current-route
│   ├── services/
│   │   ├── tsp_service.py              # OR-Tools TSP solver
│   │   ├── ws_manager.py               # WebSocket connection manager
│   │   ├── anomaly_service.py          # Orchestration logic
│   │   └── linear_client.py            # Linear integration (mockable)
│   └── schemas/
│       └── route.py                    # Pydantic models
│
└── _bmad-output/                       # Project documentation
```

---

## 9. Security (Demo Scope)

- No authentication required (demo environment, no real user data)
- Linear API key: environment variable only, never exposed to frontend
- No PII in demo dataset (all coordinates are fictional/approximate)
- Simulate Anomaly button: client-only, no server-side role check needed for POC
