"use client";

import { useState } from "react";
import type { AnomalyEvent, AnomalyEventType } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

interface Preset {
  label: string;
  affected_point_id: string;
  type: AnomalyEventType;
  note: string;
}

const PRESETS: Preset[] = [
  { label: "Sudirman Banjir",      affected_point_id: "sudirman",   type: "road_closure",  note: "3 kurir terdampak" },
  { label: "Semanggi Macet",       affected_point_id: "semanggi",   type: "road_closure",  note: "Kurir 1" },
  { label: "Senayan Ditutup",      affected_point_id: "senayan",    type: "road_closure",  note: "Kurir 2" },
  { label: "Paket Batal Thamrin",  affected_point_id: "thamrin",    type: "cancellation",  note: "Kurir 3" },
];

export default function AnomalyPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom form state
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Anomaly Simulation</h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Demo Only
        </span>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs font-medium">
        <button
          onClick={() => setMode("preset")}
          className={`flex-1 rounded-md py-1.5 transition-colors ${
            mode === "preset" ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Preset
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`flex-1 rounded-md py-1.5 transition-colors ${
            mode === "custom" ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Custom
        </button>
      </div>

      {/* Preset mode */}
      {mode === "preset" && (
        <div className="space-y-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.affected_point_id}
              onClick={() => void simulate(p.affected_point_id, p.type)}
              disabled={loading}
              className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-xs transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <span className="font-semibold text-gray-800">{p.label}</span>
                <span className="ml-2 text-gray-400">{p.type === "road_closure" ? "Penutupan" : "Pembatalan"}</span>
              </div>
              <span className="text-gray-400 shrink-0">{p.note}</span>
            </button>
          ))}
        </div>
      )}

      {/* Custom mode */}
      {mode === "custom" && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Affected Point ID
            </label>
            <input
              type="text"
              value={customPointId}
              onChange={(e) => setCustomPointId(e.target.value)}
              placeholder="contoh: semanggi, kuningan, menteng…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <p className="mt-1 text-[10px] text-gray-400">
              Cocokkan substring dari Stop ID kurir (cek demo_routes.py)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipe Anomaly
            </label>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as AnomalyEventType)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            >
              <option value="road_closure">road_closure — Jalan Ditutup</option>
              <option value="cancellation">cancellation — Paket Dibatalkan</option>
            </select>
          </div>

          <button
            onClick={() => void simulate(customPointId, customType)}
            disabled={loading || !customPointId.trim()}
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
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
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 font-bold hover:text-red-900"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
