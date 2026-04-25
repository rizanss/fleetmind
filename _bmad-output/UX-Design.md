# Fleetmind — UX Design Document

**Version:** 1.0  
**Date:** 2026-04-25  
**Author:** Riza Nursyah

---

## 1. Design Philosophy

Fleetmind is an autonomous system. The core UX challenge is: **how do you make autonomy feel safe, not scary?**

The answer is transparency. Every automated decision the system makes must be visible, explainable, and accompanied by enough context that the dispatcher can trust it. The system should feel like a **co-pilot who always reports to the pilot** — not a black box that silently takes control.

Three UX principles guide every design decision:

1. **Informed Trust** — the dispatcher always knows *why* the system acted, not just *what* it did
2. **Control First** — automation assists, never overrides the human without a visible record
3. **Signal over Noise** — during a crisis (anomaly event), the UI surfaces only what is actionable right now

---

## 2. User Persona

### "Pak Budi" — Logistics Dispatcher

| Attribute | Detail |
|---|---|
| Role | Fleet dispatcher for a Jakarta last-mile delivery company |
| Device | Desktop web browser, 1440px screen |
| Context | Manages 10–30 active couriers across a city zone per shift |
| Workflow | Monitors a map dashboard all day, intervenes when something goes wrong |
| Technical fluency | Moderate — comfortable with software tools, not a developer |
| Key pain point | Every anomaly means phone calls, manual spreadsheet updates, and delayed deliveries |
| Primary goal | Get all packages delivered on time with minimal personal firefighting |
| Trust trigger | "I can see exactly what the system did and why — and I can undo it if I disagree" |
| Distrust trigger | "The map changed and I don't know why or who changed it" |

---

## 3. Information Architecture

```
Fleetmind Dashboard
├── Map View (primary — ~70% of viewport)
│   ├── Courier position markers
│   ├── Route polylines (color-coded per courier)
│   └── Delivery stop markers (numbered by sequence)
│
└── Sidebar (~30% of viewport)
    ├── Connection Status Bar
    ├── Demo Control Panel
    │   └── Simulate Anomaly button
    └── Audit Trail Panel
        ├── Most recent event (prominent)
        └── Event history (scrollable)
```

---

## 4. Dashboard Layout

```
┌──────────────────────────────────────────┬────────────────────────┐
│                                          │  ● Connected           │
│                                          ├────────────────────────┤
│                                          │  DEMO CONTROLS         │
│                                          │  ┌──────────────────┐  │
│           LEAFLET MAP                    │  │ Simulate:        │  │
│                                          │  │ Jalan Sudirman   │  │
│   [Courier A route — blue]               │  │ Banjir           │  │
│   [Courier B route — orange]             │  └──────────────────┘  │
│   [Courier C route — green]              ├────────────────────────┤
│                                          │  AUDIT TRAIL           │
│                                          │  ─────────────────     │
│                                          │  ▼ 10:14:32            │
│                                          │  Road Closure          │
│                                          │  3 couriers affected   │
│                                          │  Recalculated in 847ms │
│                                          │                        │
│                                          │  (older events below)  │
└──────────────────────────────────────────┴────────────────────────┘
```

**Layout rationale:**
- Map is the primary cognitive surface — it deserves ~70% of the screen
- Sidebar keeps controls and history visible without competing with the map
- No modal dialogs during anomaly events — everything surfaces in-place

---

## 5. Key User Flows

### 5.1 Normal State (No Anomaly)

The dispatcher opens the dashboard. They see:
- A map of Jakarta with 3 courier routes shown as colored polylines
- Numbered stop markers along each route
- A green connection indicator at the top of the sidebar
- The Simulate Anomaly button (clearly labeled as "Demo")
- An empty audit trail with placeholder text

**Design intent:** At rest, the dashboard should feel calm and readable. No blinking, no noise. The dispatcher should be able to scan the map and know the status of every courier at a glance.

---

### 5.2 Anomaly Trigger Flow

**Step 1 — Dispatcher clicks "Simulate: Jalan Sudirman Banjir"**
- Button enters loading state immediately (spinner, disabled)
- No modal, no confirmation — this is a demo action

**Step 2 — System computes (< 2 seconds)**
- Subtle map overlay: "Recalculating routes..." label fades in near affected area
- No full-screen loading states — the map remains visible throughout

**Step 3 — Routes update**
- Old route polylines animate to new paths (smooth CSS transition, ~400ms)
- Affected stops that are now skipped or reordered show a brief highlight
- Button returns to active state

**Step 4 — Audit trail updates**
- New entry appears at top of audit trail with slide-down animation
- Entry shows:
  - Anomaly type: "Road Closure — Jalan Sudirman"
  - Timestamp: "10:14:32"
  - Affected couriers: "3 routes recalculated"
  - Performance metric: **"Route recalculated in 847ms"** (prominent, bold)

**Design intent for Step 4:** The `recalculation_time_ms` is not a footnote — it is the headline. It proves the system is fast and deterministic. Display it large enough to be noticed without looking for it.

---

### 5.3 WebSocket Disconnect / Reconnect

**Disconnect detected:**
- Connection status indicator changes from green to amber with label "Reconnecting..."
- Map remains visible with last known state — no blank/error screen
- No intrusive notification (toast or modal) unless reconnect fails all 3 attempts

**Reconnect successful:**
- Indicator returns to green
- If `sequence_id` gap detected, map silently refreshes from `GET /current-route`
- No disruptive visual jump — route state updates smoothly

**All reconnect attempts failed:**
- Indicator turns red: "Connection lost. Please refresh."
- Map stays visible with last known state

---

## 6. Component Specifications

### 6.1 Connection Status Bar

**Location:** Top of sidebar  
**States:**

| State | Visual |
|---|---|
| Connected | ● green dot + "Connected" |
| Reconnecting | ◌ amber dot + "Reconnecting..." (pulsing) |
| Disconnected | ● red dot + "Connection lost. Please refresh." |

**Implementation note:** This must always be visible. Dispatcher must never be surprised by stale data without knowing the connection is down.

---

### 6.2 Simulate Anomaly Button

**Label:** "Simulate: Jalan Sudirman Banjir"  
**Sub-label (smaller, muted):** "Demo simulation only"  

**States:**

| State | Appearance |
|---|---|
| Default | Solid red-orange button, full opacity |
| Loading | Spinner icon + "Recalculating..." label, disabled |
| Error | Border turns red, error message below button (dismissible) |

**Design rationale:** The sub-label "Demo simulation only" prevents any confusion about whether this button would affect a real fleet. Clarity over aesthetics.

---

### 6.3 Route Polylines (Leaflet)

Each courier gets a distinct color with sufficient contrast:

| Courier | Color | Hex |
|---|---|---|
| Courier A | Blue | `#3B82F6` |
| Courier B | Orange | `#F97316` |
| Courier C | Green | `#22C55E` |

**On rerouting:** The polyline smoothly transitions to the new path. Old path fades out while new path draws in (CSS opacity transition). Duration: 400ms.

**Stop markers:** Numbered circle markers matching courier color. Completed stops rendered at 40% opacity (greyed out but still visible).

---

### 6.4 Audit Trail Entry

Each entry in the audit trail:

```
┌─────────────────────────────────────────┐
│  Road Closure — Jalan Sudirman Banjir   │
│  10:14:32 · 3 couriers affected         │
│                                         │
│  ⚡ Route recalculated in 847ms         │
└─────────────────────────────────────────┘
```

- `recalculation_time_ms` rendered in a highlighted badge (bolt icon + time)
- Typography: anomaly name in medium weight, metadata in muted gray, metric in accent color
- Entry height: fixed, scrollable list — no variable heights that cause layout shift

---

## 7. Visual Design Tokens

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `surface` | `#0F172A` | Dark dashboard background |
| `surface-elevated` | `#1E293B` | Sidebar, card backgrounds |
| `text-primary` | `#F1F5F9` | Main text |
| `text-muted` | `#94A3B8` | Secondary text, metadata |
| `accent` | `#3B82F6` | Courier A, links, highlights |
| `success` | `#22C55E` | Connected status, Courier C |
| `warning` | `#F97316` | Courier B, reconnecting state |
| `danger` | `#EF4444` | Error states, anomaly trigger button |
| `metric` | `#A78BFA` | `recalculation_time_ms` badge |

### Typography

| Element | Size | Weight |
|---|---|---|
| Page title | 18px | 600 |
| Section header | 14px | 600 |
| Body | 14px | 400 |
| Metadata / muted | 12px | 400 |
| Metric badge | 13px | 700 |

### Spacing
- Base unit: 4px
- Component padding: 16px
- Section gap: 24px

---

## 8. Accessibility

- Color contrast ratio ≥ 4.5:1 for all text on background
- Connection status and button states do not rely on color alone (icons + labels)
- Map markers include aria-labels with stop number and courier ID
- Audit trail entries are keyboard-navigable
- No auto-playing animations — transitions are triggered by user action or data events only

---

## 9. Demo Presentation Notes

When presenting this demo to a technical reviewer, the recommended flow is:

1. **Set the scene** — "This is a dispatcher's dashboard. 3 couriers are currently delivering packages in Jakarta."
2. **Point to the map** — "Each colored line is a courier's optimized route. These were calculated by a TSP solver at the start of the shift."
3. **Trigger the anomaly** — "I'll simulate a road closure on Jalan Sudirman — one of Jakarta's main arteries."
4. **Let the system respond** — pause for the visual. Say nothing. Let the route lines move.
5. **Point to the metric** — "The system recalculated optimal routes for all 3 affected couriers in 847 milliseconds. No phone calls. No spreadsheet. No manual intervention."
6. **Point to the audit trail** — "And here's the full audit trail — timestamped, showing exactly what changed and why."
7. **Check Linear (optional)** — "An URGENT ticket was also automatically created in our workflow system for the operations record."

**Key message to leave with the reviewer:**  
*"This is what happens when deterministic mathematical optimization meets real-time infrastructure — not AI guessing, but math proving."*
