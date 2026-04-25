"use client";

import type { RouteResponse } from "@/lib/types";

interface AuditEntry {
  route: RouteResponse;
  receivedAt: Date;
  courierIndex: number;
}

interface Props {
  entries: AuditEntry[];
}

export type { AuditEntry };

export default function AuditTrail({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Audit Trail</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          No anomalies yet. Use the simulation panel to trigger an event.
        </p>
      </div>
    );
  }

  const reversed = [...entries].reverse();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Audit Trail
        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
          {entries.length} event{entries.length !== 1 ? "s" : ""}
        </span>
      </h2>

      <ol className="space-y-2 max-h-64 overflow-y-auto">
        {reversed.map((entry, idx) => (
          <li
            key={`${entry.route.anomaly_id}-${entry.courierIndex}`}
            className="animate-in slide-in-from-top-2 duration-300 rounded-lg border border-gray-100 bg-gray-50 p-3"
            style={{ animationDelay: `${idx * 20}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                  Courier {entry.courierIndex + 1} rerouted
                </p>
                <p className="text-xs text-gray-500">
                  {entry.receivedAt.toLocaleTimeString()}
                </p>
              </div>

              {/* Prominent recalculation time */}
              <div className="shrink-0 rounded-md bg-green-50 border border-green-200 px-2 py-1 text-center">
                <p className="text-xs font-bold text-green-700 tabular-nums">
                  {entry.route.recalc_duration_ms}ms
                </p>
                <p className="text-[10px] text-green-600 leading-tight">recalc</p>
              </div>
            </div>

            <p className="mt-1 text-[11px] text-gray-400 font-mono truncate">
              id: {entry.route.anomaly_id.slice(0, 16)}…
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
