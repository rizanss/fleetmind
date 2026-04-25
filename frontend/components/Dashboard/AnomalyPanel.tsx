"use client";

import { useState } from "react";
import type { AnomalyEvent, AnomalyEventType } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

interface Preset {
  label: string;
  affected_point_id: string;
  type: AnomalyEventType;
  note: string;
  color: string;
}

const PRESETS: Preset[] = [
  { label: "Sudirman Banjir",     affected_point_id: "sudirman",  type: "road_closure",  note: "ALL",     color: "#FF3B5C" },
  { label: "Semanggi Macet",      affected_point_id: "semanggi",  type: "road_closure",  note: "KURIR 1", color: "#00D4FF" },
  { label: "Senayan Ditutup",     affected_point_id: "senayan",   type: "road_closure",  note: "KURIR 2", color: "#FF6B35" },
  { label: "Paket Batal Thamrin", affected_point_id: "thamrin",   type: "cancellation",  note: "KURIR 3", color: "#00FF87" },
];

export default function AnomalyPanel() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [customType, setCustomType] = useState<AnomalyEventType>("road_closure");
  const [customLocation, setCustomLocation] = useState<string>("");
  const [customTarget, setCustomTarget] = useState<string>("semanggi");

  const simulate = async (pointId: string, type: AnomalyEventType, locationName?: string) => {
    if (!pointId.trim()) return;
    setLoadingId(pointId);
    setError(null);

    const payload: AnomalyEvent = {
      type,
      affected_point_id: pointId.trim(),
      ...(locationName?.trim() ? { location_name: locationName.trim() } : {}),
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${BACKEND_URL}/simulate-anomaly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(`Server error ${res.status}: ${text.slice(0, 120)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="mb-4 border-b border-[var(--fm-border)] pb-3">
        <h2 className="text-sm font-bold tracking-widest text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
          ANOMALY SIMULATION
        </h2>
        <p className="text-[10px] uppercase tracking-widest text-[var(--fm-accent)] mt-1 font-bold">
          Dynamic TSP Re-routing Engine
        </p>
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--fm-subtle)] mb-4 font-[family-name:var(--font-inter)]">
        When triggered, OR-Tools TSP solver recalculates optimal routes in real-time.
      </p>

      {/* Mode toggle */}
      <div className="mb-4 flex rounded border border-[var(--fm-border)] bg-[var(--fm-bg)] p-0.5 text-[10px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)] uppercase">
        {(["preset", "custom"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded py-1.5 transition-all ${
              mode === m
                ? "bg-[var(--fm-surface)] text-[var(--fm-text)] shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                : "text-[var(--fm-subtle)] hover:text-[var(--fm-muted)]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Preset Scenarios */}
      {mode === "preset" && (
        <div className="space-y-3">
          {PRESETS.map((p) => {
            const isLoading = loadingId === p.affected_point_id;
            return (
              <div
                key={p.affected_point_id}
                className="relative flex flex-col gap-3 rounded bg-[var(--fm-bg)] p-3 shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-colors"
                style={{ borderLeft: `3px solid ${p.color}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[12px] text-[var(--fm-text)] truncate">{p.label}</h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="rounded bg-[var(--fm-surface)] border border-[var(--fm-border)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
                        {p.type === "road_closure" ? "ROAD CLOSURE" : "CANCELLATION"}
                      </span>
                      <span 
                        className="text-[9px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)]"
                        style={{ color: p.color }}
                      >
                        {p.note}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => void simulate(p.affected_point_id, p.type)}
                  disabled={isLoading}
                  className="group relative w-full overflow-hidden rounded bg-[var(--fm-surface)] border border-[var(--fm-border)] py-1.5 text-[10px] font-bold tracking-widest text-[var(--fm-text)] transition-all hover:bg-[var(--fm-border)] disabled:opacity-50"
                >
                  {/* Hover Glow */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                    style={{ background: `linear-gradient(90deg, transparent, ${p.color}, transparent)` }}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <span className="h-2 w-2 animate-spin rounded-full border border-t-transparent border-[var(--fm-text)]" />
                        EXECUTING...
                      </>
                    ) : (
                      "TRIGGER"
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Scenarios */}
      {mode === "custom" && (
        <div className="space-y-4 rounded bg-[var(--fm-bg)] p-3 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-[var(--fm-border)] border-l-[3px] border-l-[var(--fm-accent)]">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
              Anomaly Type
            </label>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as AnomalyEventType)}
              className="w-full rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] px-2.5 py-1.5 text-[11px] text-[var(--fm-text)] font-bold tracking-wider focus:border-[var(--fm-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fm-accent)]/50 transition-colors appearance-none cursor-pointer font-[family-name:var(--font-space-grotesk)]"
            >
              <option value="road_closure">ROAD CLOSURE</option>
              <option value="cancellation">CANCELLATION</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
              Location / Road Name
            </label>
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="e.g. Jalan Sudirman, Tol JORR, Bundaran HI"
              className="w-full rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] px-2.5 py-1.5 text-[11px] text-[var(--fm-text)] font-bold tracking-wider focus:border-[var(--fm-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fm-accent)]/50 transition-colors placeholder:text-[var(--fm-subtle)]/50 font-[family-name:var(--font-space-grotesk)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
              Affected Courier
            </label>
            <select
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              className="w-full rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] px-2.5 py-1.5 text-[11px] text-[var(--fm-text)] font-bold tracking-wider focus:border-[var(--fm-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fm-accent)]/50 transition-colors appearance-none cursor-pointer font-[family-name:var(--font-space-grotesk)]"
            >
              <option value="semanggi">KURIR-01</option>
              <option value="senayan">KURIR-02</option>
              <option value="thamrin">KURIR-03</option>
              <option value="sudirman">ALL</option>
            </select>
          </div>

          <button
            onClick={() => void simulate(customTarget, customType, customLocation)}
            disabled={loadingId !== null}
            className="group relative w-full overflow-hidden rounded bg-[var(--fm-surface)] border border-[var(--fm-border)] py-1.5 text-[10px] font-bold tracking-widest text-[var(--fm-text)] transition-all hover:bg-[var(--fm-border)] disabled:opacity-50 mt-2"
          >
            {/* Hover Glow */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
              style={{ background: `linear-gradient(90deg, transparent, var(--fm-accent), transparent)` }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loadingId === customTarget ? (
                <>
                  <span className="h-2 w-2 animate-spin rounded-full border border-t-transparent border-[var(--fm-text)]" />
                  EXECUTING...
                </>
              ) : (
                "TRIGGER CUSTOM ANOMALY"
              )}
            </span>
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded border border-[var(--fm-danger)]/50 bg-[var(--fm-danger)]/10 p-3 text-xs text-[var(--fm-danger)] font-[family-name:var(--font-space-grotesk)]">
          <span className="flex-1 leading-relaxed">ERR: {error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 font-bold hover:text-white transition-colors"
          >
            [X]
          </button>
        </div>
      )}
    </div>
  );
}
