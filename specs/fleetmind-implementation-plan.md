---
title: "Fleetmind — Full Implementation Plan"
type: feat
date: 2026-04-25
status: ready
linear_project: Fleetmind
---

# Plan: Fleetmind Full Implementation

## Task Description

Implement all 15 story tickets across 4 phases of the Fleetmind Autonomous Logistics Orchestrator portfolio project. The system demonstrates real-time TSP re-routing with WebSocket push updates, a Leaflet map dashboard, and async Linear audit trail integration.

Execution order is strict: Phase 0 is a hard blocker before everything else. Phase 1 (Backend) and Phase 2 (Frontend) can run in parallel after Phase 0. Phase 3 (Linear + E2E) runs last.

User confirmation is required after each ticket is completed, per project workflow.

## Objective

1. Complete FLT-6 (STORY-0.1) first — shared data contracts that unblock all other work
2. Execute FLT-8 through FLT-13 (Backend, Phase 1) in parallel with FLT-15 through FLT-20 (Frontend, Phase 2)
3. Complete FLT-22 and FLT-23 (Phase 3: Linear production wiring + E2E verification) last
4. For each ticket: create branch, implement, update Linear status to Done, push branch, open PR
5. Never merge PRs — wait for manual review

## Relevant Files

### New Files to Create

**Backend:**
- `backend/main.py` — FastAPI app entry point, startup events, CORS, WebSocket endpoint
- `backend/schemas/route.py` — All Pydantic models (RoutePoint, AnomalyEvent, RouteResponse, WebSocketMessage, LinearTicketPayload)
- `backend/services/tsp_service.py` — Stateless OR-Tools TSP solver
- `backend/services/ws_manager.py` — WebSocket connection manager with sequence_id
- `backend/services/anomaly_service.py` — Anomaly orchestration logic
- `backend/services/linear_client.py` — LinearClient interface, ProductionLinearClient, MockLinearClient
- `backend/routers/anomaly.py` — POST /simulate-anomaly
- `backend/routers/routes.py` — GET /current-route
- `backend/requirements.txt` — Python dependencies

**Frontend:**
- `frontend/lib/types.ts` — All TypeScript interfaces (mirrors backend schemas)
- `frontend/app/page.tsx` — Main dashboard layout
- `frontend/app/layout.tsx` — Root layout with global styles
- `frontend/components/Map/FleetMap.tsx` — Leaflet map wrapper
- `frontend/components/Map/RouteLayer.tsx` — Route polyline rendering (optional, may inline in FleetMap)
- `frontend/components/Dashboard/AnomalyPanel.tsx` — Simulate Anomaly button
- `frontend/components/Dashboard/AuditTrail.tsx` — Recalculation metrics history
- `frontend/hooks/useRouteUpdates.ts` — WebSocket hook with reconnect + sequence gap recovery

### Configuration Files
- `backend/.env.example` — `LINEAR_API_KEY=` placeholder
- `frontend/.env.local.example` — `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`

---

## Step by Step Tasks

### Phase 0 — Shared Contracts (Hard Blocker)

---

#### Task 1 — FLT-6: Define Shared Data Contracts (STORY-0.1)

- **Linear Ticket:** FLT-6
- **Branch:** `feature/FLT-6-shared-data-contracts`
- **Assigned To:** backend-builder
- **Depends On:** none
- **Parallel:** false — all other tasks blocked until this is done
- **Complexity:** S

**What to implement:**

Create two files — `frontend/lib/types.ts` (TypeScript) and `backend/schemas/route.py` (Pydantic) — with semantically identical data shapes:

```typescript
// frontend/lib/types.ts
export interface RoutePoint {
  id: string
  lat: number
  lng: number
  order: number
}
export interface AnomalyEvent {
  type: "road_closure" | "cancellation"
  affected_point_id: string
  timestamp: string  // ISO8601
}
export interface RouteResponse {
  optimized_route: RoutePoint[]
  recalc_duration_ms: number
  anomaly_id: string
}
export interface WebSocketMessage {
  event: "route_updated"
  sequence_id: number
  payload: RouteResponse
}
export interface LinearTicketPayload {
  title: string
  description: string
  anomaly_id: string
}
```

```python
# backend/schemas/route.py
from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from typing import Literal

class RoutePoint(BaseModel):
    id: str; lat: float; lng: float; order: int

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
    title: str; description: str; anomaly_id: str
```

**Acceptance Criteria:**
- [ ] All 5 types defined in both files
- [ ] TypeScript types exported from `frontend/lib/types.ts`
- [ ] Pydantic models importable from `backend/schemas/route.py`
- [ ] No business logic in either file — types/schemas only

**After completion:** Update FLT-6 status → Done. Add comment. Push branch. Open PR `[FLT-6] Define shared TypeScript interfaces and Pydantic schemas`. Confirm with user.

---

### Phase 1 — Backend Core (After Phase 0, parallel with Phase 2)

All Phase 1 tasks depend on Task 1. Tasks 1.1–1.3 and 1.6 can run in parallel. Task 1.4 depends on 1.2 + 1.3. Task 1.5 depends on 1.1 + 1.2.

---

#### Task 2 — FLT-8: FastAPI Project Setup (STORY-1.1)

- **Linear Ticket:** FLT-8
- **Branch:** `feature/FLT-8-fastapi-project-setup`
- **Assigned To:** backend-builder
- **Depends On:** Task 1 (FLT-6)
- **Parallel:** true (with Tasks 3, 4, 7)
- **Complexity:** S

**What to implement:**

`backend/main.py` — FastAPI app with:
- CORS middleware: `allow_origins=["http://localhost:3000", os.getenv("FRONTEND_URL", "")]`
- `@app.on_event("startup")` that calls `TSPService` with a 1-stop trivial route to warm up OR-Tools
- Log confirmation: `logger.info("OR-Tools warm-up complete")`
- `GET /health` endpoint returning `{"status": "ok"}`
- WebSocket endpoint `/ws/route-updates` registered (wired to `WebSocketManager`)
- `requirements.txt` with: `fastapi`, `uvicorn[standard]`, `ortools`, `python-dotenv`

**Acceptance Criteria:**
- [ ] `uvicorn main:app` starts without errors
- [ ] CORS allows localhost:3000 + Vercel URL
- [ ] Startup logs `"OR-Tools warm-up complete"`
- [ ] `GET /health` returns `{"status": "ok"}`
- [ ] Project structure matches Architecture.md

**After completion:** Update FLT-8 → Done. Push branch. Open PR `[FLT-8] Initialize FastAPI project with startup warm-up and CORS`. Confirm with user.

---

#### Task 3 — FLT-9: TSP Solver Service (STORY-1.2)

- **Linear Ticket:** FLT-9
- **Branch:** `feature/FLT-9-tsp-solver-service`
- **Assigned To:** backend-builder
- **Depends On:** Task 1 (FLT-6)
- **Parallel:** true (with Tasks 2, 4, 7)
- **Complexity:** M

**What to implement:**

`backend/services/tsp_service.py`:
- `TSPService.recompute(stops: list[RoutePoint], excluded_edges: list[str]) -> RouteResponse`
- Stateless pure function — no class state, no side effects
- `recalc_duration_ms` measured with `time.perf_counter()` wrapping the solver call
- Uses OR-Tools CP-SAT/routing solver to compute optimal visit order
- `excluded_edges` are point IDs to skip (simulate road closures)
- Returns `RouteResponse` with `optimized_route: list[RoutePoint]` and `anomaly_id: str` (passed through)

Unit tests in `backend/tests/test_tsp_service.py`:
- `test_reroute_on_road_closure`: 3 couriers × 10 stops, block one edge → valid alternate route
- `test_reroute_on_cancellation`: remove a stop → valid shorter route
- Both use hardcoded Jakarta fixture data (lat/lng coordinates)
- Assert completion in < 2000ms

**Acceptance Criteria:**
- [ ] `recompute()` is stateless
- [ ] `recalc_duration_ms` in RouteResponse
- [ ] Both unit tests pass
- [ ] Solver < 2000ms for demo fixture

**After completion:** Update FLT-9 → Done. Push branch. Open PR `[FLT-9] Implement stateless OR-Tools TSP solver service`. Confirm with user.

---

#### Task 4 — FLT-10: WebSocket Manager (STORY-1.3)

- **Linear Ticket:** FLT-10
- **Branch:** `feature/FLT-10-websocket-manager`
- **Assigned To:** backend-builder
- **Depends On:** Task 1 (FLT-6)
- **Parallel:** true (with Tasks 2, 3, 7)
- **Complexity:** M

**What to implement:**

`backend/services/ws_manager.py`:
- `WebSocketManager` class with a `Set[WebSocket]` of active connections
- `async def connect(websocket: WebSocket)` — add to set
- `async def disconnect(websocket: WebSocket)` — remove from set
- `async def broadcast(message: WebSocketMessage)` — send to all; on `WebSocketDisconnect` or send failure, remove dead connection silently
- Global `sequence_id: int = 0` counter (incremented on every broadcast, starting at 1)
- Broadcast is non-blocking: use `asyncio.gather` with error handling per connection

**Acceptance Criteria:**
- [ ] `connect` / `disconnect` manage active set
- [ ] `broadcast` sends to all active connections
- [ ] `sequence_id` increments by 1 per broadcast, starts at 1
- [ ] Dead connections removed silently
- [ ] WebSocket endpoint `/ws/route-updates` registered in main.py

**After completion:** Update FLT-10 → Done. Push branch. Open PR `[FLT-10] Implement WebSocket connection manager with sequence_id tracking`. Confirm with user.

---

#### Task 5 — FLT-11: Simulate Anomaly Endpoint (STORY-1.4)

- **Linear Ticket:** FLT-11
- **Branch:** `feature/FLT-11-simulate-anomaly-endpoint`
- **Assigned To:** backend-builder
- **Depends On:** Task 3 (FLT-9), Task 4 (FLT-10)
- **Parallel:** false within Phase 1 (sequential after 3+4)
- **Complexity:** M

**What to implement:**

`backend/routers/anomaly.py`:
- `POST /simulate-anomaly` accepts `AnomalyEvent`
- Calls `TSPService.recompute(demo_stops, excluded_edges=[event.affected_point_id])`
- Calls `WebSocketManager.broadcast(WebSocketMessage(...))` synchronously
- Fires `asyncio.create_task(linear_client.create_ticket(...))` non-blocking after broadcast
- Returns `{"anomaly_id": str(uuid4()), "affected_couriers": 3, "status": "processing"}`

`backend/services/anomaly_service.py`:
- `AnomalyService(linear_client: LinearClient)` — accepts DI injection
- Orchestrates: validate → TSP recompute → WS broadcast → async Linear task

Integration test: POST with valid `AnomalyEvent` → assert WebSocket message received by mock client.

**Acceptance Criteria:**
- [ ] Endpoint accepts `AnomalyEvent`
- [ ] Returns response < 2500ms
- [ ] WS broadcast happens synchronously before response
- [ ] Linear ticket created via `asyncio.create_task` (non-blocking)
- [ ] Integration test passes

**After completion:** Update FLT-11 → Done. Push branch. Open PR `[FLT-11] Implement POST /simulate-anomaly orchestration endpoint`. Confirm with user.

---

#### Task 6 — FLT-12: Current Route State Endpoint (STORY-1.5)

- **Linear Ticket:** FLT-12
- **Branch:** `feature/FLT-12-current-route-endpoint`
- **Assigned To:** backend-builder
- **Depends On:** Task 2 (FLT-8), Task 3 (FLT-9)
- **Parallel:** false within Phase 1 (sequential after 2+3)
- **Complexity:** S

**What to implement:**

`backend/routers/routes.py`:
- `GET /current-route` returns `{"routes": list[RouteResponse], "last_sequence_id": int}`
- Returns current in-memory route state (updated after each rerouting event)
- Returns initial demo route on first call (before any anomaly triggers)
- `last_sequence_id` reflects most recently broadcast WS message

Unit test: assert response schema matches expected shape.

**Acceptance Criteria:**
- [ ] Endpoint returns correct shape
- [ ] Initial state returns demo routes (3 couriers, Jakarta coords)
- [ ] `last_sequence_id` matches WS counter
- [ ] Unit test passes

**After completion:** Update FLT-12 → Done. Push branch. Open PR `[FLT-12] Implement GET /current-route for WebSocket reconnection recovery`. Confirm with user.

---

#### Task 7 — FLT-13: LinearClient with Mock (STORY-1.6)

- **Linear Ticket:** FLT-13
- **Branch:** `feature/FLT-13-linear-client`
- **Assigned To:** backend-builder
- **Depends On:** Task 1 (FLT-6)
- **Parallel:** true (with Tasks 2, 3, 4)
- **Complexity:** M

**What to implement:**

`backend/services/linear_client.py`:
- Abstract base class / protocol: `async def create_ticket(payload: LinearTicketPayload) -> None`
- `MockLinearClient`: records calls in `self.calls: list[LinearTicketPayload]` for test assertions
- `ProductionLinearClient`: calls Linear REST API with `LINEAR_API_KEY` from env; catches all exceptions silently with `try/except Exception: logger.error(...)`
- `AnomalyService.__init__(self, linear_client: LinearClient)` — DI

Integration tests:
- `test_anomaly_with_mock_client`: assert `MockLinearClient.calls` contains entry with correct `anomaly_id`
- `test_anomaly_linear_failure`: `LinearClient` that always raises → anomaly flow still completes, no exception propagated

**Acceptance Criteria:**
- [ ] Abstract interface defined
- [ ] `MockLinearClient` records calls
- [ ] `ProductionLinearClient` silent-fails on exception
- [ ] Both integration tests pass

**After completion:** Update FLT-13 → Done. Push branch. Open PR `[FLT-13] Implement LinearClient interface with production and mock implementations`. Confirm with user.

---

### Phase 2 — Frontend Core (After Phase 0, parallel with Phase 1)

All Phase 2 tasks depend on Task 1 (FLT-6). Tasks 2.1 setup first. Then 2.2–2.5 in parallel. Task 2.6 depends on 2.2–2.5.

---

#### Task 8 — FLT-15: Next.js Project Setup (STORY-2.1)

- **Linear Ticket:** FLT-15
- **Branch:** `feature/FLT-15-nextjs-project-setup`
- **Assigned To:** frontend-builder
- **Depends On:** Task 1 (FLT-6)
- **Parallel:** true (starts alongside Phase 1 backend tasks)
- **Complexity:** S

**What to implement:**

- `npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir`
- TypeScript `strict: true` in `tsconfig.json`
- Install `leaflet` and `react-leaflet` and `@types/leaflet`
- Import Leaflet CSS in `frontend/app/layout.tsx`: `import 'leaflet/dist/leaflet.css'`
- Copy `frontend/lib/types.ts` from Task 1 into project
- Verify `npm run build` succeeds with no TypeScript errors
- Dev server runs on `localhost:3000`

**Acceptance Criteria:**
- [ ] Next.js 16 App Router with TypeScript strict mode
- [ ] Tailwind CSS configured
- [ ] Leaflet + react-leaflet installed, CSS imported globally
- [ ] `npm run build` clean
- [ ] `frontend/lib/types.ts` present

**After completion:** Update FLT-15 → Done. Push branch. Open PR `[FLT-15] Initialize Next.js 16 project with TypeScript, Tailwind, and Leaflet`. Confirm with user.

---

#### Task 9 — FLT-16: FleetMap Component (STORY-2.2)

- **Linear Ticket:** FLT-16
- **Branch:** `feature/FLT-16-fleetmap-component`
- **Assigned To:** frontend-builder
- **Depends On:** Task 8 (FLT-15)
- **Parallel:** true (with Tasks 10, 11, 12)
- **Complexity:** M

**What to implement:**

`frontend/components/Map/FleetMap.tsx`:
- `dynamic` import with `ssr: false` (Leaflet is client-only)
- Map center: `{ lat: -6.2, lng: 106.8 }`, zoom: 13
- Accepts `routes: RouteResponse[]` as prop
- Each courier's route rendered as a distinct-colored `Polyline`
- Delivery stop `CircleMarker` with order label (use `Tooltip`)
- Route prop changes trigger polyline re-render (React reconciliation handles animation via key or smooth update)
- No TypeScript `any`

**Acceptance Criteria:**
- [ ] Map centered on Jakarta, zoom 13
- [ ] Distinct-colored polylines per courier
- [ ] Stop markers with order labels
- [ ] SSR-safe dynamic import
- [ ] `RoutePoint[]` prop updates re-render polylines
- [ ] No TypeScript errors

**After completion:** Update FLT-16 → Done. Push branch. Open PR `[FLT-16] Build FleetMap component with courier route rendering`. Confirm with user.

---

#### Task 10 — FLT-17: useRouteUpdates Hook (STORY-2.3)

- **Linear Ticket:** FLT-17
- **Branch:** `feature/FLT-17-userouteupdates-hook`
- **Assigned To:** frontend-builder
- **Depends On:** Task 8 (FLT-15)
- **Parallel:** true (with Tasks 9, 11, 12)
- **Complexity:** M

**What to implement:**

`frontend/hooks/useRouteUpdates.ts`:
- Opens `WebSocket` to `${process.env.NEXT_PUBLIC_BACKEND_URL}/ws/route-updates` on mount
- Exposes `{ routes: RouteResponse[], lastUpdate: Date | null, isConnected: boolean, connectionError: string | null }`
- Reconnect strategy: exponential backoff `1s → 2s → 4s`, max 3 attempts; after 3 failures set `connectionError`
- `sequence_id` gap detection: if incoming `sequence_id > lastSequenceId + 1`, fetch `GET /current-route` and update state
- `cleanup`: close WebSocket on unmount
- No TypeScript `any`

**Acceptance Criteria:**
- [ ] Opens WS on mount, exposes correct shape
- [ ] Exponential backoff reconnect (3 attempts)
- [ ] `sequence_id` gap detection + recovery via GET
- [ ] Clean WS close on unmount
- [ ] `isConnected` accurate
- [ ] No TypeScript `any`

**After completion:** Update FLT-17 → Done. Push branch. Open PR `[FLT-17] Build useRouteUpdates hook with reconnect and sequence gap recovery`. Confirm with user.

---

#### Task 11 — FLT-18: AnomalyPanel Component (STORY-2.4)

- **Linear Ticket:** FLT-18
- **Branch:** `feature/FLT-18-anomaly-panel`
- **Assigned To:** frontend-builder
- **Depends On:** Task 8 (FLT-15)
- **Parallel:** true (with Tasks 9, 10, 12)
- **Complexity:** S

**What to implement:**

`frontend/components/Dashboard/AnomalyPanel.tsx`:
- Button label: `"Simulate: Jalan Sudirman Banjir"`
- On click: POST hardcoded `AnomalyEvent` (`type: "road_closure", affected_point_id: "sudirman", timestamp: new Date().toISOString()`) to `${BACKEND_URL}/simulate-anomaly`
- `loading` state: button disabled + spinner while request in-flight
- `error` state: inline dismissible error message on failure (non-blocking)
- "Demo Simulation" label clearly visible (e.g., badge or subtitle)
- Re-enables after response (success or error)
- No TypeScript `any`

**Acceptance Criteria:**
- [ ] Button labels correct
- [ ] Loading state on click
- [ ] Error state dismissible
- [ ] Button re-enables after response
- [ ] "Demo Simulation" indicator visible
- [ ] No TypeScript `any`

**After completion:** Update FLT-18 → Done. Push branch. Open PR `[FLT-18] Build AnomalyPanel component with Simulate Anomaly button`. Confirm with user.

---

#### Task 12 — FLT-19: AuditTrail Component (STORY-2.5)

- **Linear Ticket:** FLT-19
- **Branch:** `feature/FLT-19-audit-trail`
- **Assigned To:** frontend-builder
- **Depends On:** Task 8 (FLT-15)
- **Parallel:** true (with Tasks 9, 10, 11)
- **Complexity:** S

**What to implement:**

`frontend/components/Dashboard/AuditTrail.tsx`:
- Accepts `messages: WebSocketMessage[]` as prop (or derives from parent state)
- Renders entries in reverse chronological order
- Each entry: anomaly type, human-readable timestamp (`new Date().toLocaleString()`), affected courier count, prominently: `"Route recalculated in {X}ms"`
- New entry animation: CSS transition slide-in from top (use Tailwind `animate-`)
- Empty state: `"No anomalies yet. Use the simulation panel to trigger an event."`
- Accessible: sufficient color contrast, readable font size

**Acceptance Criteria:**
- [ ] Reverse chronological list
- [ ] Each entry shows type, timestamp, courier count, recalc ms
- [ ] `recalc_duration_ms` prominent
- [ ] Animate new entries
- [ ] Empty state message
- [ ] Accessible

**After completion:** Update FLT-19 → Done. Push branch. Open PR `[FLT-19] Build AuditTrail component with recalculation metrics display`. Confirm with user.

---

#### Task 13 — FLT-20: Main Dashboard Layout (STORY-2.6)

- **Linear Ticket:** FLT-20
- **Branch:** `feature/FLT-20-dashboard-layout`
- **Assigned To:** frontend-builder
- **Depends On:** Tasks 9, 10, 11, 12 (FLT-16, 17, 18, 19)
- **Parallel:** false (waits for all Frontend component tasks)
- **Complexity:** M

**What to implement:**

`frontend/app/page.tsx`:
- Instantiates `useRouteUpdates()` hook
- Layout: map ~70% width, sidebar panels ~30% width (Tailwind `flex` or `grid`)
- Responsive at 1280px+
- `FleetMap` receives `routes` from hook
- `AnomalyPanel` in sidebar
- `AuditTrail` in sidebar (receives messages from hook state)
- Connection status indicator: green dot if `isConnected`, red if not
- Page title: `"Fleetmind — Autonomous Logistics Orchestrator"` (in `<title>` via metadata)
- No layout shift on WS connect/disconnect

**Acceptance Criteria:**
- [ ] 70/30 layout
- [ ] 1280px+ responsive
- [ ] Hook wired to map and audit trail
- [ ] Connection status indicator
- [ ] Page title correct
- [ ] No layout shift
- [ ] No TypeScript errors

**After completion:** Update FLT-20 → Done. Push branch. Open PR `[FLT-20] Compose main dashboard page with map and panels`. Confirm with user.

---

### Phase 3 — Linear Integration (After Phase 1 + Phase 2)

---

#### Task 14 — FLT-22: Wire Production LinearClient (STORY-3.1)

- **Linear Ticket:** FLT-22
- **Branch:** `feature/FLT-22-production-linear-client`
- **Assigned To:** backend-builder
- **Depends On:** Task 5 (FLT-11), Task 7 (FLT-13)
- **Parallel:** false
- **Complexity:** M

**What to implement:**

Complete the `ProductionLinearClient.create_ticket(payload)` implementation:
- Calls Linear REST API: `POST https://api.linear.app/graphql` with mutation to create issue
- Uses `LINEAR_API_KEY` from `os.getenv("LINEAR_API_KEY")`; if missing, `logger.warning("LINEAR_API_KEY not set, skipping")` and return
- Ticket priority: 1 (Urgent)
- Title format: `[ANOMALY] {payload.anomaly_id[:8]} — {type}`
- Description: anomaly type, timestamp, `anomaly_id`, `"Auto-generated by Fleetmind"`
- All `except Exception` caught silently: `logger.error(f"Linear ticket creation failed: {e}")`

**Acceptance Criteria:**
- [ ] `ProductionLinearClient.create_ticket` calls Linear API
- [ ] Priority 1 (Urgent)
- [ ] Title format correct
- [ ] Ticket appears in Linear within 5 seconds of anomaly trigger
- [ ] Missing `LINEAR_API_KEY` → warning log, no exception
- [ ] All Linear errors caught silently
- [ ] `LINEAR_API_KEY` never exposed to frontend

**After completion:** Update FLT-22 → Done. Push branch. Open PR `[FLT-22] Wire production LinearClient to create URGENT tickets on anomaly`. Confirm with user.

---

#### Task 15 — FLT-23: E2E Demo Verification (STORY-3.2)

- **Linear Ticket:** FLT-23
- **Branch:** `feature/FLT-23-e2e-verification`
- **Assigned To:** both builders (manual verification)
- **Depends On:** All previous tasks
- **Parallel:** false
- **Complexity:** L

**What to verify (structured manual walkthrough):**

1. Start backend: `uvicorn main:app --reload` → no errors; startup log shows `"OR-Tools warm-up complete"`
2. Start frontend: `npm run dev` → map renders with 3 couriers on demo Jakarta routes
3. Browser WebSocket indicator: green
4. Click "Simulate: Jalan Sudirman Banjir" → routes update on map within 2 seconds
5. Audit trail panel shows new entry with `recalc_duration_ms` value
6. Linear workspace: URGENT ticket appears within 5 seconds
7. Refresh browser tab → WS reconnects → map shows current routes (no blank state)
8. Test Linear outage: set wrong `LINEAR_API_KEY` → demo flow completes normally, no UI error shown
9. Check browser console: no unhandled errors during full flow

**Acceptance Criteria:**
- [ ] All 9 verification steps pass
- [ ] `recalculation_time_ms` < 2000ms confirmed in audit trail
- [ ] Linear ticket appears with correct format
- [ ] No console errors

**After completion:** Update FLT-23 → Done. Push branch. Open PR `[FLT-23] End-to-end demo flow verification`. Confirm with user.

---

## Acceptance Criteria

### Functional Requirements
- [ ] All 5 data contracts identical in TypeScript and Pydantic (FLT-6)
- [ ] FastAPI starts cleanly with OR-Tools warm-up (FLT-8)
- [ ] TSP solver returns valid routes in < 2s for demo dataset (FLT-9)
- [ ] WebSocket broadcasts to all clients with monotonic sequence_id (FLT-10)
- [ ] POST /simulate-anomaly: triggers TSP, WS broadcast, async Linear task (FLT-11)
- [ ] GET /current-route: returns current state + last_sequence_id (FLT-12)
- [ ] LinearClient: silent-fails on error, injects via constructor (FLT-13)
- [ ] FleetMap: Leaflet map centered Jakarta, colored polylines, SSR-safe (FLT-16)
- [ ] useRouteUpdates: exponential backoff reconnect, sequence_id gap recovery (FLT-17)
- [ ] AnomalyPanel: loading/error states, "Demo Simulation" label (FLT-18)
- [ ] AuditTrail: reverse chronological, recalc_ms prominent, empty state (FLT-19)
- [ ] Dashboard: 70/30 layout, connection indicator, no TypeScript errors (FLT-20)
- [ ] ProductionLinearClient creates URGENT tickets with correct format (FLT-22)
- [ ] E2E hero demo scenario passes all verification steps (FLT-23)

### Non-Functional Requirements
- [ ] TypeScript strict mode: no `any` types in frontend code
- [ ] All Python schemas use Pydantic v2
- [ ] Linear API key: env var only, never in frontend
- [ ] Linear integration never blocks UI (async fire-and-forget)
- [ ] WebSocket resilience: auto-reconnect with state recovery

### Quality Gates
- [ ] `npm run build` clean (no TypeScript errors)
- [ ] All backend unit + integration tests pass
- [ ] No unhandled exceptions in browser console during full demo
- [ ] Full demo runnable without Linear connectivity (graceful degradation)

---

## Team Orchestration

As the orchestrator, you coordinate two builders and confirm with the user after each ticket is completed.

### Workflow Per Ticket
1. Create branch from `main`: `git checkout -b feature/[FLT-ID]-[short-desc]`
2. Implement according to task spec above
3. Commit all changes
4. Update Linear ticket status → Done; add comment describing what was implemented
5. Push branch: `git push origin feature/[FLT-ID]-[short-desc]`
6. Open GitHub PR with format: `[FLT-ID] Short description`
7. **Confirm with user before starting next ticket**

### Never
- Merge PRs (wait for review)
- Start Phase 2 or Phase 3 before prerequisites are done
- Expose `LINEAR_API_KEY` to any frontend code

### Task Management Tools
Use `TaskCreate` + `TaskUpdate` to track ticket progress. Mark each task `in_progress` when starting, `completed` when PR is open and user confirms.

### Team Members

#### Backend Builder
- **Name:** backend-builder
- **Role:** Backend engineer — FastAPI, Python, OR-Tools, Pydantic, WebSocket
- **Agent Type:** tactical-engineering:backend-agent
- **Handles:** Tasks 1, 2, 3, 4, 5, 6, 7, 14

#### Frontend Builder
- **Name:** frontend-builder
- **Role:** Frontend engineer — Next.js, TypeScript strict, Tailwind CSS, Leaflet, React hooks
- **Agent Type:** tactical-engineering:frontend-agent
- **Handles:** Tasks 8, 9, 10, 11, 12, 13

---

## Execution Order Summary

```
Task 1  [FLT-6]  Phase 0: Shared Contracts (BLOCKER)
    │
    ├── Task 2  [FLT-8]  Backend: FastAPI Setup      ──┐
    ├── Task 3  [FLT-9]  Backend: TSP Solver          ─┤  (parallel)
    ├── Task 4  [FLT-10] Backend: WS Manager          ─┤
    ├── Task 7  [FLT-13] Backend: LinearClient        ─┤
    │       │                                          │
    │   Task 5 [FLT-11] Backend: Anomaly Endpoint   ←─┤ (needs 3+4)
    │   Task 6 [FLT-12] Backend: Route Endpoint     ←─┘ (needs 2+3)
    │
    ├── Task 8  [FLT-15] Frontend: Next.js Setup
    │       │
    │       ├── Task 9  [FLT-16] Frontend: FleetMap     ─┐
    │       ├── Task 10 [FLT-17] Frontend: WS Hook       ─┤ (parallel)
    │       ├── Task 11 [FLT-18] Frontend: AnomalyPanel  ─┤
    │       └── Task 12 [FLT-19] Frontend: AuditTrail   ─┘
    │               │
    │           Task 13 [FLT-20] Frontend: Dashboard Layout ←─ (needs 9+10+11+12)
    │
    └── Task 14 [FLT-22] Phase 3: Production LinearClient (needs 5+7)
            │
        Task 15 [FLT-23] Phase 3: E2E Verification (needs all)
```

---

## Checklist Summary

### Phase 0: Data Contracts
- [ ] FLT-6 — Shared TypeScript + Pydantic types

### Phase 1: Backend Core
- [ ] FLT-8 — FastAPI project setup
- [ ] FLT-9 — TSP solver service
- [ ] FLT-10 — WebSocket manager
- [ ] FLT-11 — POST /simulate-anomaly
- [ ] FLT-12 — GET /current-route
- [ ] FLT-13 — LinearClient with mock

### Phase 2: Frontend Core (parallel with Phase 1)
- [ ] FLT-15 — Next.js project setup
- [ ] FLT-16 — FleetMap component
- [ ] FLT-17 — useRouteUpdates hook
- [ ] FLT-18 — AnomalyPanel component
- [ ] FLT-19 — AuditTrail component
- [ ] FLT-20 — Main dashboard layout

### Phase 3: Integration + Verification
- [ ] FLT-22 — Production LinearClient
- [ ] FLT-23 — E2E demo verification
