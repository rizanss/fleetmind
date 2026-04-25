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

const COURIER_COLORS = ["#3B82F6", "#22C55E", "#F97316"];

export default function AuditTrail({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[#F1F5F9]">Audit Trail</h2>
        <p className="text-xs text-[#64748B] leading-relaxed">
          No anomalies yet. Use the simulation panel to trigger an event.
        </p>
      </div>
    );
  }

  const reversed = [...entries].reverse();

  return (
    <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Audit Trail</h2>
        <span className="rounded-full border border-[#334155] bg-[#0F172A] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#94A3B8]">
          {entries.length} event{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      <ol className="fm-scroll space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
        {reversed.map((entry, idx) => {
          const color = COURIER_COLORS[entry.courierIndex % COURIER_COLORS.length];
          return (
            <li
              key={`${entry.route.anomaly_id}-${entry.courierIndex}`}
              className="rounded-lg border border-[#334155] bg-[#0F172A] p-3"
              style={{
                borderLeftColor: color,
                borderLeftWidth: "2px",
                animationDelay: `${idx * 20}ms`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-semibold text-[#F1F5F9] truncate">
                    Courier {entry.courierIndex + 1} rerouted
                  </p>
                  <p className="text-[10px] text-[#64748B] tabular-nums">
                    {entry.receivedAt.toLocaleTimeString()}
                  </p>
                </div>

                {/* Recalc time badge */}
                <div className="shrink-0 rounded-md border border-[#A78BFA]/30 bg-[#A78BFA]/10 px-2 py-1 text-center">
                  <p className="text-xs font-bold text-[#A78BFA] tabular-nums">
                    {entry.route.recalc_duration_ms}ms
                  </p>
                  <p className="text-[9px] text-[#A78BFA]/70 leading-tight uppercase tracking-wide">
                    recalc
                  </p>
                </div>
              </div>

              <p className="mt-1.5 text-[10px] text-[#475569] font-[family-name:var(--font-dm-mono)] truncate">
                {entry.route.anomaly_id.slice(0, 18)}…
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
