"use client";

import { useState } from "react";
import type { AnomalyEvent } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const SUDIRMAN_ANOMALY: AnomalyEvent = {
  type: "road_closure",
  affected_point_id: "sudirman",
  timestamp: "", // filled at click-time
};

export default function AnomalyPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);

    const payload: AnomalyEvent = {
      ...SUDIRMAN_ANOMALY,
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
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Anomaly Simulation</h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Demo Only
        </span>
      </div>

      <button
        onClick={() => void handleSimulate()}
        disabled={loading}
        className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {loading ? "Simulating…" : "Simulate: Jalan Sudirman Banjir"}
      </button>

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

      <p className="text-xs text-gray-400">
        Triggers OR-Tools reroute for all 3 couriers passing through Jalan Sudirman.
      </p>
    </div>
  );
}
