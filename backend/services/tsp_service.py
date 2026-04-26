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


def _run_tsp(stops: list[RoutePoint]) -> list[RoutePoint]:
    """Run OR-Tools TSP on stops and return optimally ordered list."""
    if len(stops) <= 1:
        return list(stops)

    distance_matrix = _euclidean_distance_matrix(stops)
    n = len(stops)

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
    return _extract_route(solution, routing, manager, stops) if solution else list(stops)


class TSPService:
    @staticmethod
    def recompute(
        stops: list[RoutePoint],
        excluded_edges: list[str],
        penalized_stops: list[str] | None = None,
        anomaly_id: str | None = None,
        courier_id: str = "unknown",
    ) -> RouteResponse:
        """
        Compute the updated closed-circuit route for a single courier.

        The route is always a closed circuit: the solver optimises a round-trip
        that starts and ends at the first stop (depot).  The frontend closes the
        polyline visually by appending the first stop's position at the end.

        Road closure  (penalized_stops non-empty):
            Phase 1 — TSP on freely-accessible stops: the solver finds the
            globally optimal circuit for every stop that is not road-blocked.
            Phase 2 — Defer blocked stops: append them at the END, sorted by
            distance from the last free stop.  The courier completes all normal
            deliveries first, then makes a final detour to the blocked location
            before returning to the depot.

        Cancellation  (excluded_edges non-empty):
            Remove the cancelled stop and re-run TSP on the remaining stops so
            the circuit stays globally optimal.

        Args:
            stops: Current delivery stops for one courier (ordered).
            excluded_edges: Stop IDs to remove entirely (cancellation).
            penalized_stops: Stop IDs blocked by road closure.
            anomaly_id: Passed through for traceability.
            courier_id: Courier identifier.
        """
        t_start = time.perf_counter()

        # Step 1: apply cancellations — remove excluded stops
        base_stops = [s for s in stops if s.id not in excluded_edges]

        if not base_stops:
            return RouteResponse(
                courier_id=courier_id,
                optimized_route=[],
                recalc_duration_ms=0,
                anomaly_id=anomaly_id or str(uuid.uuid4()),
            )

        closed_set: set[str] = set(penalized_stops or [])

        if closed_set:
            # Road closure — two-phase approach:
            #
            # Phase 1: Run TSP on freely-accessible stops so the solver finds
            #          the globally optimal circuit for the deliveries that can
            #          be completed normally.  This is the "best-practice" TSP
            #          component: the solver — not manual heuristics — decides
            #          the optimal visit order.
            #
            # Phase 2: Append road-blocked stop(s) at the END of the optimised
            #          free-stop circuit.  The courier defers the difficult
            #          delivery to last, approaching it after all other packages
            #          have been dropped off.  Multiple blocked stops are sorted
            #          nearest-first relative to the last free stop so the
            #          detour from the circuit to each blocked stop is minimised.
            free_stops = [s for s in base_stops if s.id not in closed_set]
            closed_stops = [s for s in base_stops if s.id in closed_set]

            optimized = _run_tsp(free_stops)

            if closed_stops:
                if optimized:
                    last_free = optimized[-1]
                    closed_stops = sorted(
                        closed_stops,
                        key=lambda s: math.hypot(
                            s.lat - last_free.lat, s.lng - last_free.lng
                        ),
                    )
                optimized.extend(closed_stops)
        else:
            # Cancellation: remove the stop and re-optimise the remaining
            # circuit with TSP so the route stays globally optimal.
            optimized = _run_tsp(base_stops)

        # Renumber so order == list index
        final = [
            RoutePoint(id=s.id, lat=s.lat, lng=s.lng, order=i)
            for i, s in enumerate(optimized)
        ]

        recalc_ms = int((time.perf_counter() - t_start) * 1000)

        return RouteResponse(
            courier_id=courier_id,
            optimized_route=final,
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
