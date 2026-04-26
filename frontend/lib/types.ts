export interface RoutePoint {
  id: string
  lat: number
  lng: number
  order: number
}

export type AnomalyEventType = "road_closure" | "cancellation"

export interface AnomalyEvent {
  type: AnomalyEventType
  affected_point_id: string
  timestamp: string // ISO8601
}

export interface RouteEventContext {
  anomaly_type: "road_closure" | "cancellation"
  affected_stop_id: string
  affected_stop_name: string
  previous_order: number
  new_order: number | null
  total_stops_before: number
  total_stops_after: number
}

export interface RouteResponse {
  courier_id: string
  optimized_route: RoutePoint[]
  recalc_duration_ms: number
  anomaly_id: string
  event_context: RouteEventContext | null
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
