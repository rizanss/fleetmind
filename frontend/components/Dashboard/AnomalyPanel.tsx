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
  { label: "Sudirman Banjir",     affected_point_id: "sudirman",  type: "road_closure",  note: "3 kurir",  color: "#EF4444" },
  { label: "Semanggi Macet",      affected_point_id: "semanggi",  type: "road_closure",  note: "Kurir 1",  color: "#F97316" },
  { label: "Senayan Ditutup",     affected_point_id: "senayan",   type: "road_closure",  note: "Kurir 2",  color: "#F97316" },
  { label: "Paket Batal Thamrin", affected_point_id: "thamrin",   type: "cancellation",  note: "Kurir 3",  color: "#A78BFA" },
];

const TYPE_LABELS: Record<AnomalyEventType, string> = {
  road_closure: "Penutupan",
  cancellation: "Pembatalan",
};

export default function AnomalyPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [customPointId, setCustomPointId] = useState("");
  const [customType, setCustomType] = useState<AnomalyEventType>("road_closure");

  const simulate = async (pointId: string, type: AnomalyEventType) => {
    if (!pointId.trim()) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Anomaly Simulation</h2>
        <span className="flex items-center gap-1.5 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#F97316]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F97316] animate-pulse" />
          Demo
        </span>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-[#334155] p-0.5 bg-[#0F172A] text-xs font-semibold">
        {(["preset", "custom"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 capitalize transition-all duration-150 ${
              mode === m
                ? "bg-[#334155] text-[#F1F5F9] shadow-sm"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Preset mode */}
      {mode === "preset" && (
        <div className="space-y-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.affected_point_id}
              onClick={() => void simulate(p.affected_point_id, p.type)}
              disabled={loading}
              style={{ "--hover-color": p.color } as React.CSSProperties}
              className="group w-full flex items-center justify-between rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-left text-xs transition-all duration-150 hover:border-[#EF4444]/40 hover:bg-[#EF4444]/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="font-semibold text-[#F1F5F9] truncate">{p.label}</span>
                <span className="text-[#64748B] shrink-0">{TYPE_LABELS[p.type]}</span>
              </div>
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                style={{ color: p.color, background: `${p.color}20` }}
              >
                {p.note}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Custom mode */}
      {mode === "custom" && (
        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#64748B] mb-1.5">
              Affected Point ID
            </label>
            <input
              type="text"
              value={customPointId}
              onChange={(e) => setCustomPointId(e.target.value)}
              placeholder="semanggi, kuningan, menteng…"
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#475569] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/30 transition-colors font-[family-name:var(--font-dm-mono)]"
            />
            <p className="mt-1 text-[10px] text-[#475569]">
              Substring dari Stop ID kurir — cek demo_routes.py
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#64748B] mb-1.5">
              Tipe Anomaly
            </label>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as AnomalyEventType)}
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-xs text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/30 transition-colors appearance-none cursor-pointer"
            >
              <option value="road_closure">road_closure — Jalan Ditutup</option>
              <option value="cancellation">cancellation — Paket Dibatalkan</option>
            </select>
          </div>

          <button
            onClick={() => void simulate(customPointId, customType)}
            disabled={loading || !customPointId.trim()}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-[#EF4444] to-[#F97316] shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:shadow-[0_0_28px_rgba(239,68,68,0.45)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {loading ? "Simulating…" : "Simulate"}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#FCA5A5]">
          <span className="flex-1 leading-relaxed">{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 font-bold text-[#EF4444] hover:text-[#FCA5A5] transition-colors"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
