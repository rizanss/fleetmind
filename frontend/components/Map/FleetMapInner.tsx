"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip } from "react-leaflet";
import type { RouteResponse } from "@/lib/types";

// New futuristic color palette for couriers
const COURIER_COLORS = ["#00D4FF", "#FF6B35", "#00FF87", "#A855F7", "#FF3B5C"];

interface Props {
  routes: RouteResponse[];
}

export default function FleetMapInner({ routes }: Props) {
  // Fix for React hydration issues with Leaflet
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full bg-[var(--fm-bg)]" />;

  return (
    <div className="relative h-full w-full bg-[var(--fm-bg)]">
      {/* Overlay Label */}
      <div className="pointer-events-none absolute left-1/2 top-6 z-[1000] -translate-x-1/2 rounded-full border border-[var(--fm-border)] bg-[var(--fm-surface)]/60 px-6 py-2 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <h2 className="text-[10px] font-black tracking-[0.3em] text-[var(--fm-subtle)] font-[family-name:var(--font-inter)]">
          JAKARTA DELIVERY NETWORK
        </h2>
      </div>

      {/* Legend Box */}
      <div className="absolute bottom-6 left-6 z-[1000] rounded-lg border border-[var(--fm-border)] bg-[var(--fm-surface)]/90 p-3 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        {COURIER_COLORS.slice(0, 3).map((c, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5 last:mb-0">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }} />
            <span className="text-[10px] font-bold tracking-widest text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
              KURIR-0{i+1}
            </span>
          </div>
        ))}
      </div>

      <MapContainer
        center={[-6.2, 106.8]}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {routes.map((route, idx) => {
          const color = COURIER_COLORS[idx % COURIER_COLORS.length];
          const positions = route.optimized_route.map(
            (p) => [p.lat, p.lng] as [number, number]
          );
          
          const firstPoint = route.optimized_route[0];

          return (
            <div key={`${route.anomaly_id}-${idx}`}>
              <Polyline positions={positions} pathOptions={{ color, weight: 3, opacity: 0.8 }} className="animate-pulse" />

              {/* Courier Badge on the map (attached to the first point of the route) */}
              {firstPoint && (
                <Marker 
                  position={[firstPoint.lat, firstPoint.lng]} 
                  icon={L.divIcon({
                    className: "bg-transparent border-none",
                    html: `<div style="background: var(--fm-surface); border-left: 2px solid ${color}; color: ${color}; box-shadow: 0 4px 12px rgba(0,0,0,0.5);" class="rounded px-2 py-1 text-[9px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)] whitespace-nowrap">KURIR-0${idx+1} | TSP Route</div>`,
                    iconAnchor: [-10, 10]
                  })} 
                />
              )}

              {/* Delivery Stops */}
              {route.optimized_route.map((stop) => {
                const stopIcon = L.divIcon({
                  className: "bg-transparent border-none",
                  html: `<div style="background: ${color}; box-shadow: 0 0 10px ${color}; color: #000;" class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold font-[family-name:var(--font-space-grotesk)] border border-[var(--fm-surface)]">${stop.order + 1}</div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                });

                return (
                  <Marker
                    key={stop.id}
                    position={[stop.lat, stop.lng]}
                    icon={stopIcon}
                  >
                    <Tooltip permanent={false} direction="top">
                      <span className="text-[10px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)] uppercase">
                        #{stop.order + 1} {stop.id}
                      </span>
                    </Tooltip>
                  </Marker>
                );
              })}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
