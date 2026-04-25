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
