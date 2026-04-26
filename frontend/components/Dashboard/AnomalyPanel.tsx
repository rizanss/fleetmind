"use client";

import { useEffect, useState } from "react";
import type { AnomalyEvent, AnomalyEventType } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

/* ── Preset definitions ── */
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

/* ── Stop data from backend ── */
interface StopInfo {
  id: string;
  label: string;
}

type StopsMap = Record<string, StopInfo[]>;

const COURIER_LABELS: Record<string, string> = {
  courier_1: "KURIR-01",
  courier_2: "KURIR-02",
  courier_3: "KURIR-03",
};

const COURIER_COLORS: Record<string, string> = {
  courier_1: "#00D4FF",
  courier_2: "#FF6B35",
  courier_3: "#00FF87",
};

/* ── Component ── */
interface Props {
  onReset?: () => void;
}

export default function AnomalyPanel({ onReset }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"preset" | "custom">("preset");

  // Custom form state
  const [stopsMap, setStopsMap] = useState<StopsMap>({});
  const [customCourier, setCustomCourier] = useState<string>("");
  const [customStop, setCustomStop] = useState<string>("");
  const [customType, setCustomType] = useState<AnomalyEventType>("road_closure");

  // Fetch available stops when switching to custom mode
  useEffect(() => {
    if (mode !== "custom" || Object.keys(stopsMap).length > 0) return;

    const fetchStops = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/demo-stops`);
        if (!res.ok) return;
        const data = (await res.json()) as StopsMap;
        setStopsMap(data);

        // Auto-select first courier and its first stop
        const courierIds = Object.keys(data);
        if (courierIds.length > 0) {
          setCustomCourier(courierIds[0]);
          if (data[courierIds[0]].length > 0) {
            setCustomStop(data[courierIds[0]][0].id);
          }
        }
      } catch {
        // Silently fail — form will show empty
      }
    };
    void fetchStops();
  }, [mode, stopsMap]);

  // When courier changes, auto-select its first stop
  const handleCourierChange = (courierId: string) => {
    setCustomCourier(courierId);
    const stops = stopsMap[courierId];
    if (stops && stops.length > 0) {
      setCustomStop(stops[0].id);
    } else {
      setCustomStop("");
    }
  };

  const simulate = async (pointId: string, type: AnomalyEventType) => {
    if (!pointId.trim()) return;
    setLoadingId(pointId);
    setError(null);

    const payload: AnomalyEvent = {
      type,
      affected_point_id: pointId.trim(),
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

  const resetRoutes = async () => {
    setLoadingId("__reset__");
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/reset-routes`, { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        setError(`Reset failed ${res.status}: ${text.slice(0, 120)}`);
      } else {
        onReset?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoadingId(null);
    }
  };

  // Derive available stops for the selected courier
  const availableStops = customCourier ? stopsMap[customCourier] ?? [] : [];
  const selectedStopLabel = availableStops.find((s) => s.id === customStop)?.label ?? "";
  const courierColor = COURIER_COLORS[customCourier] ?? "var(--fm-accent)";

  const selectClass =
    "w-full rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] px-2.5 py-1.5 text-[11px] text-[var(--fm-text)] font-bold tracking-wider focus:border-[var(--fm-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--fm-accent)]/50 transition-colors appearance-none cursor-pointer font-[family-name:var(--font-space-grotesk)]";
  const labelClass =
    "block text-[9px] font-bold uppercase tracking-widest text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]";

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

      {/* ════════ Preset Scenarios ════════ */}
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

      {/* ════════ Custom Scenarios ════════ */}
      {mode === "custom" && (
        <div
          className="space-y-4 rounded bg-[var(--fm-bg)] p-3 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-[var(--fm-border)] border-l-[3px]"
          style={{ borderLeftColor: courierColor }}
        >
          {/* Step 1: Pick a Courier */}
          <div className="space-y-1.5">
            <label className={labelClass}>
              ① Target Courier
            </label>
            <select
              value={customCourier}
              onChange={(e) => handleCourierChange(e.target.value)}
              className={selectClass}
            >
              {Object.keys(stopsMap).length === 0 ? (
                <option value="">Loading stops...</option>
              ) : (
                Object.keys(stopsMap).map((cId) => (
                  <option key={cId} value={cId}>
                    {COURIER_LABELS[cId] ?? cId}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Step 2: Pick which stop to block */}
          <div className="space-y-1.5">
            <label className={labelClass}>
              ② Affected Stop / Location
            </label>
            <select
              value={customStop}
              onChange={(e) => setCustomStop(e.target.value)}
              className={selectClass}
            >
              {availableStops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}  ({s.id})
                </option>
              ))}
            </select>
            {customStop && (
              <p className="text-[9px] text-[var(--fm-subtle)] mt-1 font-[family-name:var(--font-space-grotesk)] opacity-70">
                This stop will be excluded from {COURIER_LABELS[customCourier] ?? customCourier}&apos;s route and TSP will recompute.
              </p>
            )}
          </div>

          {/* Step 3: Anomaly type */}
          <div className="space-y-1.5">
            <label className={labelClass}>
              ③ Anomaly Type
            </label>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as AnomalyEventType)}
              className={selectClass}
            >
              <option value="road_closure">ROAD CLOSURE — block this stop</option>
              <option value="cancellation">CANCELLATION — remove delivery</option>
            </select>
          </div>

          {/* Preview */}
          {customStop && (
            <div className="rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)] mb-1.5">
                Preview
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)] uppercase"
                  style={{ color: courierColor, backgroundColor: `${courierColor}15`, border: `1px solid ${courierColor}30` }}
                >
                  {COURIER_LABELS[customCourier] ?? customCourier}
                </span>
                <span className="rounded bg-[var(--fm-bg)] border border-[var(--fm-border)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
                  {customType === "road_closure" ? "ROAD CLOSURE" : "CANCELLATION"}
                </span>
                <span className="rounded bg-[var(--fm-bg)] border border-[var(--fm-border)] px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
                  {selectedStopLabel}
                </span>
              </div>
            </div>
          )}

          {/* Trigger */}
          <button
            onClick={() => void simulate(customStop, customType)}
            disabled={loadingId !== null || !customStop}
            className="group relative w-full overflow-hidden rounded bg-[var(--fm-surface)] border border-[var(--fm-border)] py-1.5 text-[10px] font-bold tracking-widest text-[var(--fm-text)] transition-all hover:bg-[var(--fm-border)] disabled:opacity-50 mt-1"
          >
            {/* Hover Glow */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
              style={{ background: `linear-gradient(90deg, transparent, ${courierColor}, transparent)` }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loadingId === customStop ? (
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

      {/* Reset Button */}
      <button
        onClick={() => void resetRoutes()}
        disabled={loadingId !== null}
        className="group relative mt-4 w-full overflow-hidden rounded border border-[var(--fm-warning)]/30 bg-[var(--fm-bg)] py-2 text-[10px] font-bold tracking-widest text-[var(--fm-warning)] transition-all hover:border-[var(--fm-warning)]/60 hover:bg-[var(--fm-warning)]/10 disabled:opacity-50"
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-transparent via-[var(--fm-warning)] to-transparent" />
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loadingId === "__reset__" ? (
            <>
              <span className="h-2 w-2 animate-spin rounded-full border border-t-transparent border-[var(--fm-warning)]" />
              RESETTING...
            </>
          ) : (
            <>⟲ RESET ALL ROUTES</>
          )}
        </span>
      </button>
    </div>
  );
}
