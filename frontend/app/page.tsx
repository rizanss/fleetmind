"use client";

import { useEffect, useRef, useState } from "react";
import FleetMap from "@/components/Map/FleetMap";
import AnomalyPanel from "@/components/Dashboard/AnomalyPanel";
import AuditTrail, { type AuditEntry } from "@/components/Dashboard/AuditTrail";
import { useRouteUpdates } from "@/hooks/useRouteUpdates";

function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <span className="text-[11px] font-bold tracking-widest opacity-0">00:00:00</span>;

  return (
    <span className="text-[12px] font-bold tracking-widest text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)] tabular-nums">
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </span>
  );
}

export default function DashboardPage() {
  const { routes, lastUpdate, isConnected, connectionError } = useRouteUpdates();
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const prevUpdateRef = useRef<Date | null>(null);
  const seenRouteKeysRef = useRef(new Set<string>());

  useEffect(() => {
    if (!lastUpdate || lastUpdate === prevUpdateRef.current) return;
    prevUpdateRef.current = lastUpdate;

    const newEntries: AuditEntry[] = [];
    routes.forEach((route) => {
      if (route.recalc_duration_ms === 0) return;
      const key = `${route.anomaly_id}-${route.courier_id}`;
      if (seenRouteKeysRef.current.has(key)) return;
      seenRouteKeysRef.current.add(key);
      newEntries.push({ route, receivedAt: lastUpdate });
    });

    if (newEntries.length > 0) setAuditEntries((prev) => [...prev, ...newEntries]);
  }, [lastUpdate, routes]);

  const handleReset = () => {
    setAuditEntries([]);
    seenRouteKeysRef.current.clear();
  };

  const statusLabel = isConnected ? "LIVE" : connectionError ? "ERROR" : "CONNECTING";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-transparent">
      {/* Header */}
      <header className="relative flex shrink-0 items-center justify-between border-b border-[var(--fm-border)] bg-[var(--fm-surface)]/50 px-6 py-4 backdrop-blur-sm">
        {/* Subtle glow effect */}
        <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--fm-accent)] to-transparent opacity-30" />

        <div className="flex items-center gap-4">
          {/* Logomark */}
          <img
            src="/fleetmind-logo.png"
            alt="Logo"
            className="h-10 w-auto drop-shadow-[0_0_5px_var(--fm-accent)]"
          />
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--fm-text)] font-[family-name:var(--font-inter)] drop-shadow-[0_0_8px_rgba(241,245,249,0.3)] leading-none">
              Fleetmind
            </h1>
            <p className="text-[10px] text-[var(--fm-subtle)] uppercase tracking-wider mt-1.5 font-medium font-[family-name:var(--font-inter)] leading-none">
              Pick the best routes for your couriers
            </p>
          </div>
        </div>

        {/* Right side: Clock and Status */}
        <div className="flex items-center gap-6">
          <LiveClock />

          <div className="flex items-center gap-2 rounded-full border border-[var(--fm-border)] bg-[var(--fm-bg)] px-3 py-1 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
            <div className="relative flex h-2 w-2 items-center justify-center">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--fm-success)] opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${isConnected ? "bg-[var(--fm-success)] shadow-[0_0_5px_var(--fm-success)]" : connectionError ? "bg-[var(--fm-danger)]" : "bg-[var(--fm-warning)]"
                  }`}
              />
            </div>
            <span
              className={`text-[11px] font-bold tracking-widest uppercase font-[family-name:var(--font-space-grotesk)] ${isConnected ? "text-[var(--fm-success)]" : connectionError ? "text-[var(--fm-danger)]" : "text-[var(--fm-warning)]"
                }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Map area */}
        <main className="flex-[6] min-w-0 relative">
          <FleetMap routes={routes} />
        </main>

        {/* Sidebar — does NOT scroll as a whole; each panel manages its own overflow */}
        <aside className="flex-[4] min-w-[320px] max-w-md flex flex-col gap-4 overflow-hidden border-l border-[var(--fm-border)] bg-[var(--fm-surface)]/80 p-4 backdrop-blur-md shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          {/* Simulation panel: capped so AuditTrail always has visible room */}
          <div className="fm-scroll shrink-0 overflow-y-auto max-h-[58%]">
            <AnomalyPanel onReset={handleReset} />
          </div>
          {/* AuditTrail: flex-1 fills whatever height remains */}
          <AuditTrail entries={auditEntries} />
        </aside>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-[var(--fm-border)] bg-[var(--fm-surface)] px-4 py-1.5 flex items-center justify-center">
        <p className="text-[9px] uppercase tracking-[0.15em] text-[var(--fm-subtle)] font-bold font-[family-name:var(--font-space-grotesk)]">
          Powered by Google OR-Tools · Last-Mile Delivery
        </p>
      </footer>
    </div>
  );
}
