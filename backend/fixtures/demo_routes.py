"""
Hardcoded Jakarta demo dataset — 3 couriers, 8 stops each.
All stops in Courier 1-3 pass through the Sudirman corridor.
Affected point IDs for the "Jalan Sudirman Banjir" scenario contain "sudirman".
"""
from __future__ import annotations

from backend.schemas.route import RoutePoint

# Courier 1 — North-to-Central Jakarta, passes through Sudirman
COURIER_1_STOPS: list[RoutePoint] = [
    RoutePoint(id="c1_pluit",       lat=-6.1211, lng=106.8740, order=0),
    RoutePoint(id="c1_penjaringan", lat=-6.1350, lng=106.8520, order=1),
    RoutePoint(id="c1_harmoni",     lat=-6.1650, lng=106.8150, order=2),
    RoutePoint(id="c1_sudirman",    lat=-6.2005, lng=106.8175, order=3),  # Jalan Sudirman
    RoutePoint(id="c1_semanggi",    lat=-6.2120, lng=106.8230, order=4),
    RoutePoint(id="c1_kuningan",    lat=-6.2260, lng=106.8310, order=5),
    RoutePoint(id="c1_casablanca",  lat=-6.2180, lng=106.8450, order=6),
    RoutePoint(id="c1_menteng",     lat=-6.1960, lng=106.8380, order=7),
]

# Courier 2 — West Jakarta, cuts through Sudirman axis
COURIER_2_STOPS: list[RoutePoint] = [
    RoutePoint(id="c2_grogol",      lat=-6.1680, lng=106.7950, order=0),
    RoutePoint(id="c2_slipi",       lat=-6.1890, lng=106.7990, order=1),
    RoutePoint(id="c2_palmerah",    lat=-6.2030, lng=106.7920, order=2),
    RoutePoint(id="c2_sudirman",    lat=-6.2055, lng=106.8100, order=3),  # Jalan Sudirman
    RoutePoint(id="c2_senayan",     lat=-6.2190, lng=106.8010, order=4),
    RoutePoint(id="c2_kebayoran",   lat=-6.2420, lng=106.8060, order=5),
    RoutePoint(id="c2_blok_m",      lat=-6.2450, lng=106.7990, order=6),
    RoutePoint(id="c2_cipulir",     lat=-6.2560, lng=106.7890, order=7),
]

# Courier 3 — South Jakarta, enters city via Sudirman
COURIER_3_STOPS: list[RoutePoint] = [
    RoutePoint(id="c3_lebak_bulus", lat=-6.2890, lng=106.7740, order=0),
    RoutePoint(id="c3_fatmawati",   lat=-6.2740, lng=106.7930, order=1),
    RoutePoint(id="c3_mampang",     lat=-6.2560, lng=106.8150, order=2),
    RoutePoint(id="c3_sudirman",    lat=-6.2080, lng=106.8130, order=3),  # Jalan Sudirman
    RoutePoint(id="c3_bundaran_hi", lat=-6.1950, lng=106.8230, order=4),
    RoutePoint(id="c3_thamrin",     lat=-6.1870, lng=106.8240, order=5),
    RoutePoint(id="c3_gambir",      lat=-6.1760, lng=106.8300, order=6),
    RoutePoint(id="c3_pasar_baru",  lat=-6.1610, lng=106.8340, order=7),
]

# Map: courier_id -> stops
DEMO_ROUTES: dict[str, list[RoutePoint]] = {
    "courier_1": COURIER_1_STOPS,
    "courier_2": COURIER_2_STOPS,
    "courier_3": COURIER_3_STOPS,
}

SUDIRMAN_AFFECTED_POINT_ID = "sudirman"
