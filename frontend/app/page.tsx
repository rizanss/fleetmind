"use client";

import { useEffect, useRef, useState } from "react";
import FleetMap from "@/components/Map/FleetMap";
import AnomalyPanel from "@/components/Dashboard/AnomalyPanel";
import AuditTrail, { type AuditEntry } from "@/components/Dashboard/AuditTrail";
import { useRouteUpdates } from "@/hooks/useRouteUpdates";

export default function DashboardPage() {
  const { routes, lastUpdate, isConnected, connectionError } = useRouteUpdates();
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const prevUpdateRef = useRef<Date | null>(null);
  // Tracks "anomaly_id-slotIndex" keys already added to the audit trail
  const seenRouteKeysRef = useRef(new Set<string>());

  useEffect(() => {
    if (!lastUpdate || lastUpdate === prevUpdateRef.current) return;
    prevUpdateRef.current = lastUpdate;

    const newEntries: AuditEntry[] = [];
    routes.forEach((route, idx) => {
      if (route.recalc_duration_ms === 0) return;
      const key = `${route.anomaly_id}-${idx}`;
      if (seenRouteKeysRef.current.has(key)) return;
      seenRouteKeysRef.current.add(key);
      newEntries.push({ route, receivedAt: lastUpdate, courierIndex: idx });
    });

    if (newEntries.length > 0) setAuditEntries((prev) => [...prev, ...newEntries]);
  }, [lastUpdate, routes]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        <div>
          <h1 className="text-sm font-bold text-gray-900 tracking-tight">Fleetmind</h1>
          <p className="text-xs text-gray-400">Autonomous Logistics Orchestrator</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">
            {isConnected ? "Live" : connectionError ? "Error" : "Connecting…"}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-w-0">
        <main className="flex-[7] min-w-0 relative">
          <FleetMap routes={routes} />
        </main>

        <aside className="flex-[3] min-w-[280px] max-w-sm flex flex-col gap-3 overflow-y-auto border-l border-gray-200 bg-white p-3">
          <AnomalyPanel />
          <AuditTrail entries={auditEntries} />
        </aside>
      </div>
    </div>
  );
}
