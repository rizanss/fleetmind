"""
Stateless TSP solver wrapping Google OR-Tools.
Pure function: same input always produces same output. No side effects.
"""
from __future__ import annotations

import math
import time
import uuid

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from backend.schemas.route import RoutePoint, RouteResponse


def _euclidean_distance_matrix(stops: list[RoutePoint]) -> list[list[int]]:
    """
    Scaled Euclidean distance matrix (integer, required by OR-Tools).
    Accurate enough for the small demo dataset.
    """
    n = len(stops)
    matrix: list[list[int]] = []
    for i in range(n):
        row: list[int] = []
        for j in range(n):
            dlat = stops[i].lat - stops[j].lat
            dlng = stops[i].lng - stops[j].lng
            dist = math.hypot(dlat, dlng)
            row.append(int(dist * 1_000_000))
        matrix.append(row)
    return matrix


def _extract_route(
    solution: pywrapcp.Assignment,
    routing: pywrapcp.RoutingModel,
    manager: pywrapcp.RoutingIndexManager,
    active_stops: list[RoutePoint],
) -> list[RoutePoint]:
    route: list[RoutePoint] = []
    index = routing.Start(0)
    order = 0
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        s = active_stops[node]
        route.append(RoutePoint(id=s.id, lat=s.lat, lng=s.lng, order=order))
        order += 1
        index = solution.Value(routing.NextVar(index))
    return route


class TSPService:
    @staticmethod
    def recompute(
        stops: list[RoutePoint],
        excluded_edges: list[str],
        anomaly_id: str | None = None,
        courier_id: str = "unknown",
    ) -> RouteResponse:
        """
        Compute optimal route for a single courier.

        Args:
            stops: Ordered list of delivery stops for one courier.
            excluded_edges: Stop IDs to skip (e.g. flooded road nodes).
            anomaly_id: Passed through into the response for traceability.
            courier_id: Identifier for the courier this route belongs to.

        Returns:
            RouteResponse with courier_id, optimized_route, recalc_duration_ms, anomaly_id.
        """
        active_stops = [s for s in stops if s.id not in excluded_edges]

        if len(active_stops) <= 1:
            return RouteResponse(
                courier_id=courier_id,
                optimized_route=active_stops,
                recalc_duration_ms=0,
                anomaly_id=anomaly_id or str(uuid.uuid4()),
            )

        distance_matrix = _euclidean_distance_matrix(active_stops)
        n = len(active_stops)

        t_start = time.perf_counter()

        manager = pywrapcp.RoutingIndexManager(n, 1, 0)
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index: int, to_index: int) -> int:
            return distance_matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

        transit_idx = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)

        params = pywrapcp.DefaultRoutingSearchParameters()
        params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        params.time_limit.seconds = 1  # Hard cap; demo dataset is tiny so this is never hit

        solution = routing.SolveWithParameters(params)

        recalc_ms = int((time.perf_counter() - t_start) * 1000)

        optimized = (
            _extract_route(solution, routing, manager, active_stops)
            if solution
            else active_stops
        )

        return RouteResponse(
            courier_id=courier_id,
            optimized_route=optimized,
            recalc_duration_ms=recalc_ms,
            anomaly_id=anomaly_id or str(uuid.uuid4()),
        )

    @staticmethod
    def warmup() -> None:
        """Single trivial TSP call to pre-initialize OR-Tools C++ libraries."""
        dummy = [
            RoutePoint(id="w0", lat=0.0, lng=0.0, order=0),
            RoutePoint(id="w1", lat=0.1, lng=0.1, order=1),
            RoutePoint(id="w2", lat=0.2, lng=0.0, order=2),
        ]
        TSPService.recompute(dummy, excluded_edges=[], anomaly_id="warmup")
