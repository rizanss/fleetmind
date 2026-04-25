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

const COURIER_COLORS = ["#00D4FF", "#FF6B35", "#00FF87", "#A855F7", "#FF3B5C"];

export default function AuditTrail({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex-1 rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        <div className="mb-4 border-b border-[var(--fm-border)] pb-3">
          <h2 className="text-sm font-bold tracking-widest text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
            SYSTEM LOG / AUDIT TRAIL
          </h2>
        </div>
        <p className="text-xs text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
          // No anomalies detected. System nominal.
        </p>
      </div>
    );
  }

  const reversed = [...entries].reverse();

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-[var(--fm-border)] pb-3 shrink-0">
        <h2 className="text-sm font-bold tracking-widest text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
          SYSTEM LOG / AUDIT TRAIL
        </h2>
        <span className="rounded bg-[var(--fm-bg)] border border-[var(--fm-border)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--fm-subtle)]">
          {entries.length} EVENT{entries.length !== 1 ? "S" : ""}
        </span>
      </div>

      <ol className="fm-scroll flex-1 space-y-2 overflow-y-auto pr-2">
        {reversed.map((entry, idx) => {
          const color = COURIER_COLORS[entry.courierIndex % COURIER_COLORS.length];
          return (
            <li
              key={`${entry.route.anomaly_id}-${entry.courierIndex}`}
              className="rounded bg-[var(--fm-bg)] p-3 border border-[var(--fm-border)] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
              style={{
                borderLeft: `2px solid ${color}`,
                animationDelay: `${idx * 20}ms`,
              }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
                      [{entry.receivedAt.toLocaleTimeString('en-US', { hour12: false })}]
                    </span>
                    <span 
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)] uppercase"
                      style={{ color: color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                    >
                      KURIR-0{entry.courierIndex + 1} REROUTED
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[var(--fm-metric)] font-[family-name:var(--font-space-grotesk)] drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
                    ⚡ {entry.route.recalc_duration_ms}ms — TSP recomputed
                  </span>
                </div>

                <p className="text-[9px] text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)] truncate opacity-70">
                  ID: {entry.route.anomaly_id}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
