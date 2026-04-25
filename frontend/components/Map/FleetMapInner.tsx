"use client";

import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import type { RouteResponse } from "@/lib/types";

const COURIER_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444"];

interface Props {
  routes: RouteResponse[];
}

export default function FleetMapInner({ routes }: Props) {
  return (
    <MapContainer
      center={[-6.2, 106.8]}
      zoom={13}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routes.map((route, idx) => {
        const color = COURIER_COLORS[idx % COURIER_COLORS.length];
        const positions = route.optimized_route.map(
          (p) => [p.lat, p.lng] as [number, number]
        );

        return (
          <div key={`${route.anomaly_id}-${idx}`}>
            <Polyline positions={positions} pathOptions={{ color, weight: 3, opacity: 0.85 }} />

            {route.optimized_route.map((stop) => (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={7}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
              >
                <Tooltip permanent={false} direction="top">
                  <span className="text-xs font-mono">
                    #{stop.order + 1} {stop.id}
                  </span>
                </Tooltip>
              </CircleMarker>
            ))}
          </div>
        );
      })}
    </MapContainer>
  );
}
