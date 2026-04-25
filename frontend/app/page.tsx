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

  const statusLabel = isConnected ? "Live" : connectionError ? "Error" : "Connecting…";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0F172A]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#1E293B] bg-[#0F172A] px-5 py-3">
        <div className="flex items-center gap-3">
          {/* Logomark */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6] text-white text-[10px] font-black tracking-tight shadow-[0_0_12px_rgba(59,130,246,0.4)]">
            FM
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#F1F5F9] tracking-tight leading-none">
              Fleetmind
            </h1>
            <p className="text-[10px] text-[#64748B] uppercase tracking-widest mt-0.5">
              Logistics Orchestrator
            </p>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isConnected ? "bg-[#22C55E]" : connectionError ? "bg-[#EF4444]" : "bg-[#F97316]"
              }`}
            />
          </div>
          <span
            className={`text-xs font-medium tabular-nums ${
              isConnected ? "text-[#22C55E]" : connectionError ? "text-[#EF4444]" : "text-[#F97316]"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Map area */}
        <main className="flex-[7] min-w-0 relative">
          <FleetMap routes={routes} />
        </main>

        {/* Sidebar */}
        <aside className="fm-scroll flex-[3] min-w-[280px] max-w-sm flex flex-col gap-3 overflow-y-auto border-l border-[#1E293B] bg-[#0F172A] p-3">
          <AnomalyPanel />
          <AuditTrail entries={auditEntries} />
        </aside>
      </div>
    </div>
  );
}
