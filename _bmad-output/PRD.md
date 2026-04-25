# Fleetmind — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-25  
**Author:** Riza Nursyah  
**Project Type:** Portfolio / Proof of Concept

---

## 1. Executive Summary

Fleetmind is a portfolio/demo project showcasing an **Autonomous Logistics Orchestrator** for last-mile delivery. The system demonstrates how Geospatial Data Science, Dynamic TSP Routing, and real-time WebSocket communication can be combined to eliminate manual dispatcher intervention when delivery anomalies occur.

**Primary Goal:** Demonstrate production-thinking, full-stack engineering to technical reviewers — covering real-time systems, mathematical optimization, and modern agentic workflow patterns.

---

## 2. Problem Statement

Last-mile delivery systems today rely on **static TSP (Travelling Salesman Problem) algorithms**. Routes are computed once at the start of a shift and rarely updated unless a dispatcher manually intervenes.

When real-world anomalies occur — road closures, flooding, vehicle breakdowns, sudden order cancellations — the current process is:

1. Field report (call/message) reaches the dispatcher
2. Dispatcher manually recalculates affected routes
3. Dispatcher contacts each courier individually with new instructions
4. Courier updates their path

This process introduces significant delay, fuel waste, and SLA degradation. During peak hours or multi-courier incidents, the dispatcher becomes a **firefighter** rather than a strategic orchestrator.

---

## 3. Solution

An Autonomous Logistics Orchestrator that:

- Visualizes delivery routes in real-time on an interactive map dashboard
- Accepts anomaly triggers (manual simulation for demo purposes)
- Automatically recalculates optimal routes using deterministic TSP computation (Google OR-Tools)
- Pushes route updates to all connected dashboards via WebSocket in real-time
- Creates audit trail tickets in Linear asynchronously
- Displays `recalculation_time_ms` as a visible performance proof point

**Core design principle:** No LLM or AI model at runtime. The rerouting brain is pure deterministic mathematics — explainable, testable, fast.

---

## 4. Target Users

### Primary User: Logistics Dispatcher / Operator

**Persona: "Pak Budi"**
- Manages 10–30 couriers across a city zone
- Monitors delivery progress via a web dashboard throughout the day
- Currently intervenes manually for every route-impacting anomaly
- Values: clarity, situational awareness, auditability, control
- Primary fear: losing visibility into what the system is deciding on his behalf

**Demo Audience:**
- Technical reviewers, engineering hiring managers
- Logistics-domain stakeholders evaluating the concept

---

## 5. Core Features

### F1 — Interactive Route Map
Leaflet-based interactive map showing all active couriers, their assigned delivery stops, and current optimized routes. All route data updates in real-time via WebSocket. The map is the primary UI surface.

### F2 — Simulate Anomaly Button
A demo-only control panel for triggering predefined anomaly scenarios. The hero scenario for this POC is **"Jalan Sudirman Banjir"** (road closure due to flooding).

- Scoped to demo environment only
- Clearly labeled as a simulation control
- Single trigger → affects multiple couriers simultaneously

### F3 — Dynamic TSP Re-routing Engine
Google OR-Tools TSP solver that recalculates optimal routes for all affected couriers when an anomaly is triggered.

- Stateless: pure-function computation per trigger
- Deterministic: same input always produces same output
- Target: < 2 seconds for demo dataset (3 couriers, ~10 stops each)
- Warm-up at server startup to eliminate cold-start latency

### F4 — Real-time Dashboard Update
WebSocket push from backend to frontend immediately after recalculation completes.

- Leaflet map animates route changes live
- Audit trail panel displays: anomaly type, timestamp, old route vs new route, `recalculation_time_ms`
- `recalculation_time_ms` shown prominently as a demo selling point

### F5 — Linear Audit Trail (Async)
When an anomaly is triggered and rerouting completes, an URGENT ticket is created in Linear non-blocking (async background task). This serves as the audit trail and demonstrates real-world workflow integration.

- Must never block or delay the UI update
- Must silent-fail if Linear is unavailable (no UI impact)
- Ticket contains: anomaly description, affected couriers, old/new routes, timestamp

---

## 6. Hero Demo Scenario

**"Jalan Sudirman Banjir"**

> *"3 kurir sedang dalam perjalanan di Jakarta. Tiba-tiba Jalan Sudirman banjir dan ditutup. Dalam 847ms, sistem mendeteksi anomali, menghitung ulang rute optimal untuk semua kurir yang terdampak, mendorong pembaruan ke dashboard secara real-time, dan membuat audit trail otomatis — tanpa satu pun telepon atau intervensi manual."*

**Why this scenario:**

| Reason | Detail |
|---|---|
| Visually dramatic | Multiple route lines change simultaneously on a live map |
| Locally relatable | Jakarta flooding is a well-known real pain for Indonesian reviewers |
| Demonstrates scale | Single trigger → multiple couriers → system-level response |
| Metric proof | `recalculation_time_ms` makes the speed claim tangible and credible |

---

## 7. Out of Scope (This POC)

- Mobile app for couriers
- Real GPS/sensor data integration
- Authentication and multi-user access control
- Persistent database (no data storage beyond in-memory session state)
- Production fleet deployment
- ML-based anomaly prediction or detection
- Role-based access control for Simulate button
- Manual override with system learning

---

## 8. Success Criteria

| Criterion | Target |
|---|---|
| Route recalculation time | < 2 seconds for demo dataset |
| WebSocket push latency | < 500ms after OR-Tools completes |
| Linear ticket creation | Async — never blocks UI |
| Dashboard stability | No crash during full demo flow |
| Visual clarity | Reviewer can follow route change without explanation |
| Audit trail | Ticket visible in Linear within 5 seconds of anomaly trigger |

---

## 9. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 16+ (App Router), TypeScript, Tailwind CSS | Modern, type-safe, portfolio-standard |
| Map | Leaflet + OpenStreetMap | Open source, no API key, testable |
| Backend | Python, FastAPI | Async-native, OR-Tools Python bindings |
| Routing Engine | Google OR-Tools | Proven TSP/VRP solver, deterministic |
| Real-time | WebSocket (FastAPI native) | Simple, no external broker needed |
| Workflow Integration | Linear MCP | Async audit trail, demonstrates agentic tooling |
| Deployment | Vercel (frontend), Railway (backend) | Free tier available for demo |

---

## 10. Constraints

- Solo developer scope: features must be completable without a team
- No paid APIs in the critical path (Leaflet + OpenStreetMap only)
- Linear integration must be optional and mockable — demo must work without Linear connectivity
- Demo dataset is small and hardcoded (3 couriers, fixed stop coordinates in Jakarta)
