# Fleetmind — Epics & User Stories

**Version:** 1.0  
**Date:** 2026-04-25  
**Implementation Order:** Phase 0 → Phase 1 → Phase 2 → Phase 3

---

## Phase 0 — Shared Contracts

> Hard blocker for all other phases. Must be committed to the repo before any backend or frontend work begins.

---

### EPIC-0: Data Contract Foundation

Establish all shared TypeScript interfaces and Pydantic models that form the contract between frontend and backend. No business logic — only type definitions.

---

#### STORY-0.1 — Define Shared Data Contracts

**Title:** Define all shared TypeScript interfaces and Pydantic schemas

**Description:**  
Create `frontend/lib/types.ts` with all TypeScript interfaces and `backend/schemas/route.py` with all Pydantic models. Both files must be semantically identical. This is the single source of truth for data shapes across the system.

**Acceptance Criteria:**
- [ ] `RoutePoint` defined in both TypeScript and Pydantic: `{ id, lat, lng, order }`
- [ ] `AnomalyEvent` defined: `{ type: "road_closure" | "cancellation", affected_point_id, timestamp }`
- [ ] `RouteResponse` defined: `{ optimized_route: RoutePoint[], recalc_duration_ms: int, anomaly_id }`
- [ ] `WebSocketMessage` defined: `{ event: "route_updated", sequence_id: int, payload: RouteResponse }`
- [ ] `LinearTicketPayload` defined: `{ title, description, anomaly_id }`
- [ ] TypeScript types exported from `frontend/lib/types.ts`
- [ ] Pydantic models importable from `backend/schemas/route.py`
- [ ] No business logic in either file — types/schemas only

**Priority:** Critical  
**Complexity:** S

---

## Phase 1 — Backend Core

> Can begin after Phase 0. All backend stories can be worked in parallel.

---

### EPIC-1: Backend API & Routing Engine

Build the FastAPI backend with TSP computation, WebSocket management, and anomaly orchestration.

---

#### STORY-1.1 — FastAPI Project Setup

**Title:** Initialize FastAPI project with startup warm-up and CORS

**Description:**  
Set up the FastAPI application with proper project structure, CORS configuration for the Vercel frontend, and an OR-Tools warm-up call at startup to eliminate cold-start latency during demo.

**Acceptance Criteria:**
- [ ] FastAPI app initializes without errors (`uvicorn main:app`)
- [ ] CORS configured to allow frontend origin (localhost:3000 + Vercel URL)
- [ ] `@app.on_event("startup")` executes a dummy TSP solve (1 trivial route) to warm up OR-Tools
- [ ] Server logs confirm warm-up completed: `"OR-Tools warm-up complete"`
- [ ] Health check endpoint: `GET /health` returns `{ "status": "ok" }`
- [ ] Project structure matches `backend/` layout in Architecture.md

**Priority:** Critical  
**Complexity:** S

---

#### STORY-1.2 — TSP Solver Service

**Title:** Implement stateless OR-Tools TSP solver service

**Description:**  
Create `backend/services/tsp_service.py` as a pure-function TSP solver using Google OR-Tools. Given a list of stops and a set of excluded edges (representing blocked roads), returns an optimized route with recalculation duration.

**Acceptance Criteria:**
- [ ] `TSPService.recompute(stops: list[RoutePoint], excluded_edges: list[str]) -> RouteResponse` implemented
- [ ] Function is stateless — no side effects, no shared state
- [ ] `recalc_duration_ms` measured via `time.perf_counter()` wrapping the solver call
- [ ] Unit test: `test_reroute_on_road_closure` — given 3 couriers with 10 stops, blocking one edge produces a valid alternate route
- [ ] Unit test: `test_reroute_on_cancellation` — removing a stop produces valid shorter route
- [ ] Both tests use hardcoded fixture data (Jakarta demo coordinates)
- [ ] Solver completes in < 2000ms for demo fixture data
- [ ] Returns `RouteResponse` matching the Pydantic schema from STORY-0.1

**Priority:** Critical  
**Complexity:** M

---

#### STORY-1.3 — WebSocket Manager

**Title:** Implement WebSocket connection manager with sequence_id tracking

**Description:**  
Create `backend/services/ws_manager.py` to manage all active WebSocket connections and broadcast `WebSocketMessage` to all clients after a rerouting event. Maintains a monotonically increasing `sequence_id`.

**Acceptance Criteria:**
- [ ] `WebSocketManager.connect(websocket)` adds connection to active set
- [ ] `WebSocketManager.disconnect(websocket)` removes connection cleanly
- [ ] `WebSocketManager.broadcast(message: WebSocketMessage)` sends to all active connections
- [ ] `sequence_id` increments by 1 on every broadcast, starting at 1
- [ ] Broadcast is non-blocking: a slow/dead client does not delay others
- [ ] Dead connections are cleaned up silently on send failure
- [ ] WebSocket endpoint `/ws/route-updates` registered in main.py

**Priority:** Critical  
**Complexity:** M

---

#### STORY-1.4 — Simulate Anomaly Endpoint

**Title:** Implement POST /simulate-anomaly orchestration endpoint

**Description:**  
Create `backend/routers/anomaly.py` with the `POST /simulate-anomaly` endpoint. This endpoint validates the anomaly event, calls `TSPService`, broadcasts via `WebSocketManager`, and fires the Linear ticket creation as a background task.

**Acceptance Criteria:**
- [ ] `POST /simulate-anomaly` accepts `AnomalyEvent` request body
- [ ] Returns `{ anomaly_id: uuid, affected_couriers: int, status: "processing" }` immediately after WebSocket broadcast
- [ ] Calls `TSPService.recompute(...)` synchronously before responding
- [ ] Broadcasts `WebSocketMessage` via `WebSocketManager` before responding
- [ ] Creates Linear ticket via `asyncio.create_task(...)` after responding (non-blocking)
- [ ] Response time < 2500ms for demo fixture data
- [ ] Integration test: POST with valid `AnomalyEvent` → assert WebSocket message received

**Priority:** Critical  
**Complexity:** M

---

#### STORY-1.5 — Current Route State Endpoint

**Title:** Implement GET /current-route for WebSocket reconnection recovery

**Description:**  
Create `backend/routers/routes.py` with a `GET /current-route` endpoint that returns the latest known route state and `last_sequence_id`. Used by the frontend when a WebSocket reconnection detects a missed update.

**Acceptance Criteria:**
- [ ] `GET /current-route` returns `{ routes: list[RouteResponse], last_sequence_id: int }`
- [ ] Returns the most recent route state (updated after every rerouting)
- [ ] Returns initial demo route state on first call (before any anomaly)
- [ ] `last_sequence_id` matches the most recently broadcast WebSocket message
- [ ] Unit test: assert response shape matches schema

**Priority:** High  
**Complexity:** S

---

#### STORY-1.6 — Linear Client with Mock

**Title:** Implement LinearClient interface with production and mock implementations

**Description:**  
Create `backend/services/linear_client.py` with a clean interface and two implementations: a production implementation that calls the Linear API, and a mock for testing. `AnomalyService` must inject `LinearClient` via constructor so tests can swap implementations.

**Acceptance Criteria:**
- [ ] `LinearClient` abstract interface: `async def create_ticket(payload: LinearTicketPayload) -> None`
- [ ] `ProductionLinearClient` calls Linear API using `LINEAR_API_KEY` env var
- [ ] `MockLinearClient` records calls in memory (for test assertions)
- [ ] All exceptions in `ProductionLinearClient` caught with `try/except Exception`, logged to server logger, never re-raised
- [ ] `AnomalyService` accepts `LinearClient` as constructor argument
- [ ] Integration test: `AnomalyService` with `MockLinearClient` — assert ticket created with correct `anomaly_id`
- [ ] Integration test: `AnomalyService` with `LinearClient` that raises — assert no exception propagates, anomaly flow still completes

**Priority:** High  
**Complexity:** M

---

## Phase 2 — Frontend Core

> Can begin in parallel with Phase 1, after Phase 0. All frontend stories can be worked in parallel.

---

### EPIC-2: Frontend Dashboard

Build the Next.js dashboard with Leaflet map, real-time WebSocket updates, and demo controls.

---

#### STORY-2.1 — Next.js Project Setup

**Title:** Initialize Next.js 16 project with TypeScript, Tailwind, and Leaflet

**Description:**  
Set up the Next.js App Router project with TypeScript strict mode, Tailwind CSS, and Leaflet. Configure the project layout matching `frontend/` structure in Architecture.md.

**Acceptance Criteria:**
- [ ] Next.js 16 App Router initialized with TypeScript strict mode
- [ ] Tailwind CSS configured and functional
- [ ] Leaflet installed (`leaflet`, `react-leaflet`)
- [ ] Leaflet CSS imported globally (avoids icon rendering issues)
- [ ] `frontend/lib/types.ts` in place (from STORY-0.1)
- [ ] `npm run build` completes without TypeScript errors
- [ ] Development server runs on `localhost:3000`

**Priority:** Critical  
**Complexity:** S

---

#### STORY-2.2 — Leaflet Map Component

**Title:** Build FleetMap component with courier route rendering

**Description:**  
Create `frontend/components/Map/FleetMap.tsx` that renders a Leaflet map centered on Jakarta, with route polylines for each courier and markers for delivery stops. Routes are passed as props and re-render when updated.

**Acceptance Criteria:**
- [ ] Map renders centered on Jakarta (lat: -6.2, lng: 106.8), zoom: 13
- [ ] Each courier's route rendered as a distinct-colored polyline
- [ ] Delivery stop markers rendered with stop order label
- [ ] Route changes animate smoothly (polyline transition, not hard swap)
- [ ] Renders correctly in SSR-safe way (Leaflet is client-only — use dynamic import with `ssr: false`)
- [ ] `RoutePoint[]` prop updates trigger re-render with new polylines
- [ ] No TypeScript errors with strict mode

**Priority:** Critical  
**Complexity:** M

---

#### STORY-2.3 — useRouteUpdates WebSocket Hook

**Title:** Build useRouteUpdates hook with reconnect and sequence gap recovery

**Description:**  
Create `frontend/hooks/useRouteUpdates.ts` that manages the WebSocket connection to `/ws/route-updates`, handles reconnection with exponential backoff, detects `sequence_id` gaps, and fetches current state from `GET /current-route` when a gap is detected.

**Acceptance Criteria:**
- [ ] Opens WebSocket to `ws://{BACKEND_URL}/ws/route-updates` on mount
- [ ] Exposes `{ routes, lastUpdate, isConnected, connectionError }`
- [ ] On disconnect: retries with exponential backoff (1s, 2s, 4s), max 3 attempts
- [ ] Tracks last received `sequence_id`; if incoming `sequence_id > last + 1`, fetches `GET /current-route` and updates state
- [ ] Closes WebSocket cleanly on component unmount
- [ ] `isConnected` accurately reflects connection state
- [ ] TypeScript strict mode: no `any` types

**Priority:** Critical  
**Complexity:** M

---

#### STORY-2.4 — Anomaly Control Panel

**Title:** Build AnomalyPanel component with Simulate Anomaly button

**Description:**  
Create `frontend/components/Dashboard/AnomalyPanel.tsx` with the "Simulate Anomaly" button. On click, POST `AnomalyEvent` to `/simulate-anomaly`. Shows a loading state while waiting and an error state if the request fails.

**Acceptance Criteria:**
- [ ] Button labeled "Simulate: Jalan Sudirman Banjir"
- [ ] On click: POSTs hardcoded `AnomalyEvent` (`type: "road_closure"`) to backend
- [ ] Button disabled and shows loading state during active request
- [ ] Error state displayed if request fails (non-blocking, dismissible)
- [ ] Button re-enables after response received (success or error)
- [ ] Clearly labeled as "Demo Simulation" to distinguish from production controls
- [ ] TypeScript strict mode: no `any` types

**Priority:** Critical  
**Complexity:** S

---

#### STORY-2.5 — Audit Trail Panel

**Title:** Build AuditTrail component with recalculation metrics display

**Description:**  
Create `frontend/components/Dashboard/AuditTrail.tsx` that displays the history of anomaly events and route recalculations. Each entry shows: anomaly type, timestamp, affected couriers, and prominently displays `recalculation_time_ms`.

**Acceptance Criteria:**
- [ ] Renders list of anomaly events in reverse chronological order
- [ ] Each entry shows: anomaly type, human-readable timestamp, affected courier count
- [ ] `recalculation_time_ms` displayed prominently: `"Route recalculated in Xms"`
- [ ] New entries animate in from top (not a hard jump)
- [ ] Empty state: "No anomalies yet. Use the simulation panel to trigger an event."
- [ ] Accessible: sufficient color contrast, readable font size
- [ ] Updates reactively when new `WebSocketMessage` received

**Priority:** High  
**Complexity:** S

---

#### STORY-2.6 — Main Dashboard Layout

**Title:** Compose main dashboard page with map and panels

**Description:**  
Assemble `frontend/app/page.tsx` combining the `FleetMap`, `AnomalyPanel`, and `AuditTrail` components into a coherent dashboard layout. The map should be the primary focus; panels sit alongside it.

**Acceptance Criteria:**
- [ ] Layout: map takes ~70% width, panels in sidebar (~30% width)
- [ ] Responsive: usable on 1280px+ screens (primary demo resolution)
- [ ] `useRouteUpdates` hook wired to map — route changes propagate automatically
- [ ] Connection status indicator visible (green dot = connected, red = disconnected)
- [ ] Page title: "Fleetmind — Autonomous Logistics Orchestrator"
- [ ] No layout shift on WebSocket connect/disconnect
- [ ] TypeScript strict mode: no errors

**Priority:** Critical  
**Complexity:** M

---

## Phase 3 — Linear Integration

> Built last. Non-blocking. Demo must work without Linear.

---

### EPIC-3: Linear Audit Trail Integration

Connect the async Linear ticket creation to the live Linear workspace for the full demo wow factor.

---

#### STORY-3.1 — Linear Ticket Auto-Creation

**Title:** Wire production LinearClient to create URGENT tickets on anomaly

**Description:**  
Implement `ProductionLinearClient` to create an URGENT Linear ticket when an anomaly is triggered. Ticket must contain enough context for a reviewer to understand what happened at a glance.

**Acceptance Criteria:**
- [ ] `ProductionLinearClient.create_ticket(payload)` calls Linear API with `LINEAR_API_KEY` env var
- [ ] Ticket created with `priority: urgent` (Linear priority value: 1)
- [ ] Ticket title format: `[ANOMALY] {type} — {affected_point_id}`
- [ ] Ticket description includes: anomaly type, timestamp, `anomaly_id`, note: "Auto-generated by Fleetmind"
- [ ] Ticket appears in Linear workspace within 5 seconds of anomaly trigger
- [ ] If `LINEAR_API_KEY` is missing, client logs a warning and skips (no exception)
- [ ] All Linear API errors caught silently — no exception propagates to anomaly flow

**Priority:** High  
**Complexity:** M

---

#### STORY-3.2 — End-to-End Demo Verification

**Title:** Verify complete demo flow end-to-end

**Description:**  
Full end-to-end verification of the hero demo scenario: "Jalan Sudirman Banjir." This is not automated testing — it is a structured manual walkthrough of the complete demo flow to confirm everything works together.

**Acceptance Criteria:**
- [ ] Backend starts with no errors; OR-Tools warm-up logged at startup
- [ ] Frontend loads; map renders with 3 couriers on demo routes in Jakarta
- [ ] WebSocket connection established; status indicator shows green
- [ ] "Simulate: Jalan Sudirman Banjir" button click triggers rerouting
- [ ] Map route lines update within 2 seconds of button click
- [ ] Audit trail shows new entry with `recalculation_time_ms` value
- [ ] Linear URGENT ticket appears in workspace within 5 seconds
- [ ] Browser tab refresh → WebSocket reconnects → map shows current routes (no blank state)
- [ ] Linear API outage simulation (wrong API key) → demo flow completes normally, no UI error shown
- [ ] Console shows no unhandled errors during full demo flow

**Priority:** Critical  
**Complexity:** L
