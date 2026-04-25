"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RouteResponse, WebSocketMessage } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const WS_URL = BACKEND_URL.replace(/^http/, "ws") + "/ws/route-updates";
const CURRENT_ROUTE_URL = BACKEND_URL + "/current-route";

const BACKOFF_DELAYS_MS = [1000, 2000, 4000];

interface RouteUpdatesState {
  routes: RouteResponse[];
  lastUpdate: Date | null;
  isConnected: boolean;
  connectionError: string | null;
}

export function useRouteUpdates(): RouteUpdatesState {
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const lastSeqRef = useRef<number>(0);
  const attemptRef = useRef<number>(0);
  const unmountedRef = useRef(false);
  // Tracks which anomaly batch is being received so each courier fills a distinct slot
  const anomalyBatchRef = useRef<{ id: string; count: number }>({ id: "", count: 0 });

  const fetchCurrentRoute = useCallback(async () => {
    try {
      const res = await fetch(CURRENT_ROUTE_URL);
      if (!res.ok) return;
      const data = (await res.json()) as { routes: RouteResponse[]; last_sequence_id: number };
      setRoutes(data.routes);
      lastSeqRef.current = data.last_sequence_id;
      setLastUpdate(new Date());
    } catch {
      // Non-fatal: we'll get the next push via WebSocket
    }
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      setIsConnected(true);
      setConnectionError(null);
      attemptRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (unmountedRef.current) return;
      try {
        const msg = JSON.parse(event.data) as WebSocketMessage;
        if (msg.event !== "route_updated") return;

        // Gap detection: if we missed messages, fetch authoritative state
        if (msg.sequence_id > lastSeqRef.current + 1 && lastSeqRef.current > 0) {
          void fetchCurrentRoute();
        } else {
          // All couriers in a simulate event share the same anomaly_id.
          // Track batch slot so each courier fills position 0, 1, 2 instead of overwriting.
          const batch = anomalyBatchRef.current;
          if (msg.payload.anomaly_id !== batch.id) {
            anomalyBatchRef.current = { id: msg.payload.anomaly_id, count: 0 };
          }
          const slot = anomalyBatchRef.current.count;
          anomalyBatchRef.current.count++;

          setRoutes((prev) => {
            const next = [...prev];
            if (slot < next.length) next[slot] = msg.payload;
            else next.push(msg.payload);
            return next;
          });
        }
        lastSeqRef.current = msg.sequence_id;
        setLastUpdate(new Date());
      } catch {
        // Malformed message — ignore
      }
    };

    ws.onerror = () => {
      // onclose will fire next; state update happens there
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setIsConnected(false);

      const attempt = attemptRef.current;
      if (attempt < BACKOFF_DELAYS_MS.length) {
        attemptRef.current += 1;
        setTimeout(connect, BACKOFF_DELAYS_MS[attempt]);
      } else {
        setConnectionError("Unable to connect to server after 3 attempts");
      }
    };
  }, [fetchCurrentRoute]);

  useEffect(() => {
    unmountedRef.current = false;
    // Fetch initial state, then open WebSocket
    void fetchCurrentRoute().then(connect);

    return () => {
      unmountedRef.current = true;
      wsRef.current?.close();
    };
  }, [connect, fetchCurrentRoute]);

  return { routes, lastUpdate, isConnected, connectionError };
}
