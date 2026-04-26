"use client";

import type { RouteEventContext, RouteResponse } from "@/lib/types";

interface AuditEntry {
  route: RouteResponse;
  receivedAt: Date;
}

interface Props {
  entries: AuditEntry[];
}

export type { AuditEntry };

const COURIER_COLOR_MAP: Record<string, string> = {
  courier_1: "#00D4FF",
  courier_2: "#FF6B35",
  courier_3: "#00FF87",
};

const COURIER_LABEL_MAP: Record<string, string> = {
  courier_1: "KURIR-01",
  courier_2: "KURIR-02",
  courier_3: "KURIR-03",
};

function getCourierColor(courierId: string): string {
  return COURIER_COLOR_MAP[courierId] ?? "#A855F7";
}

function getCourierLabel(courierId: string): string {
  return COURIER_LABEL_MAP[courierId] ?? courierId.toUpperCase();
}

// Varied narrations — picked deterministically from anomaly UUID so each
// event gets a different reason but stays stable across re-renders.
const ROAD_CLOSURE_NARRATIONS = [
  "Jalan ditutup. Titik ini akan didatangi paling akhir untuk menghemat waktu.",
  "Akses terputus. Kurir mengantar paket lain dulu sebelum ke lokasi ini.",
  "Ada penutupan jalan. Rute diubah agar pengiriman lain tidak terlambat.",
  "Jalur tidak bisa dilewati. Rute disesuaikan ulang agar kurir tidak membuang waktu.",
  "Kendala di jalan. Titik ini digeser ke urutan terakhir.",
  "Jalanan ditutup. Sistem mengatur ulang rute agar tetap efisien.",
  "Lokasi sulit diakses. Kurir menunda pengiriman ini ke urutan paling belakang.",
  "Jalan ditutup sementara. Kurir akan mencari jalan alternatif setelah paket lain selesai.",
];

const CANCELLATION_NARRATIONS = [
  "Paket dibatalkan. Kurir langsung lanjut ke tujuan berikutnya.",
  "Order dibatalkan pembeli. Titik ini dihapus dari rute pengiriman.",
  "Pengiriman dibatalkan. Sistem langsung menghitung ulang rute agar lebih cepat.",
  "Pesanan tidak jadi dikirim. Rute kurir otomatis diperbarui.",
  "Paket ditarik. Kurir tidak perlu lagi mampir ke lokasi ini.",
  "Pembatalan sukses. Waktu tempuh kurir jadi lebih singkat.",
  "Order dibatalkan. Sistem menyesuaikan rute tanpa titik pengiriman ini.",
  "Paket batal dikirim. Titik ini dilewati dari jadwal kurir.",
];

function pickNarration(anomalyId: string, type: "road_closure" | "cancellation"): string {
  const pool = type === "road_closure" ? ROAD_CLOSURE_NARRATIONS : CANCELLATION_NARRATIONS;
  // Use first 8 hex digits of UUID as a stable seed — same event always maps to same narration
  const seed = parseInt(anomalyId.replace(/-/g, "").slice(0, 8), 16);
  return pool[seed % pool.length];
}

function AnomalyTypeBadge({ type }: { type: "road_closure" | "cancellation" }) {
  if (type === "road_closure") {
    return (
      <span
        className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)] uppercase"
        style={{
          color: "var(--fm-warning)",
          backgroundColor: "rgba(255,107,53,0.1)",
          border: "1px solid rgba(255,107,53,0.25)",
        }}
      >
        ROAD CLOSURE
      </span>
    );
  }
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)] uppercase"
      style={{
        color: "var(--fm-danger)",
        backgroundColor: "rgba(255,59,92,0.1)",
        border: "1px solid rgba(255,59,92,0.25)",
      }}
    >
      CANCELLED
    </span>
  );
}

function EventDetails({ ctx, anomalyId }: { ctx: RouteEventContext; anomalyId: string }) {
  const narration = pickNarration(anomalyId, ctx.anomaly_type);

  if (ctx.anomaly_type === "road_closure") {
    const isLast =
      ctx.new_order !== null && ctx.new_order === ctx.total_stops_after - 1;
    const newLabel =
      ctx.new_order !== null
        ? `#${ctx.new_order + 1}${isLast ? " — LAST" : ""}`
        : "—";

    return (
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
          <span style={{ color: "var(--fm-warning)" }}>{ctx.affected_stop_name}</span>
          {" deferred: stop "}
          <span className="text-[var(--fm-muted)]">#{ctx.previous_order + 1}</span>
          {" → "}
          <span style={{ color: "var(--fm-warning)" }}>{newLabel}</span>
        </p>
        <p className="text-[10px] text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)] leading-relaxed">
          {narration}
        </p>
      </div>
    );
  }

  // cancellation
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
        <span style={{ color: "var(--fm-danger)" }}>{ctx.affected_stop_name}</span>
        {" dihapus: stop "}
        <span className="text-[var(--fm-muted)]">#{ctx.previous_order + 1}</span>
        <span className="text-[var(--fm-subtle)]">
          {" · "}{ctx.total_stops_before} → {ctx.total_stops_after} titik
        </span>
      </p>
      <p className="text-[10px] text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)] leading-relaxed">
        {narration}
      </p>
    </div>
  );
}

export default function AuditTrail({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex-1 min-h-0 rounded border border-[var(--fm-border)] bg-[var(--fm-surface)] p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        <div className="mb-4 border-b border-[var(--fm-border)] pb-3">
          <h2 className="text-sm font-bold tracking-widest text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
            HISTORY
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
      <div className="mb-4 flex items-center justify-between border-b border-[var(--fm-border)] pb-3 shrink-0">
        <h2 className="text-sm font-bold tracking-widest text-[var(--fm-text)] font-[family-name:var(--font-space-grotesk)]">
          HISTORY
        </h2>
        <span className="rounded bg-[var(--fm-bg)] border border-[var(--fm-border)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--fm-subtle)]">
          {entries.length} EVENT{entries.length !== 1 ? "S" : ""}
        </span>
      </div>

      <ol className="fm-scroll flex-1 space-y-2 overflow-y-auto pr-2">
        {reversed.map((entry, idx) => {
          const color = getCourierColor(entry.route.courier_id);
          const label = getCourierLabel(entry.route.courier_id);
          const ctx = entry.route.event_context;

          return (
            <li
              key={`${entry.route.anomaly_id}-${entry.route.courier_id}`}
              className="rounded bg-[var(--fm-bg)] p-3 border border-[var(--fm-border)] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
              style={{
                borderLeft: `2px solid ${color}`,
                animationDelay: `${idx * 20}ms`,
              }}
            >
              <div className="flex flex-col gap-2">
                {/* Row 1: timestamp + courier badge + anomaly type */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
                    [{entry.receivedAt.toLocaleTimeString("en-US", { hour12: false })}]
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest font-[family-name:var(--font-space-grotesk)] uppercase"
                    style={{
                      color,
                      backgroundColor: `${color}15`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    {label}
                  </span>
                  {ctx && <AnomalyTypeBadge type={ctx.anomaly_type} />}
                </div>

                {/* Row 2: human-readable event description */}
                {ctx ? (
                  <EventDetails ctx={ctx} anomalyId={entry.route.anomaly_id} />
                ) : (
                  <p className="text-[11px] text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)]">
                    Rute dihitung ulang
                  </p>
                )}

                {/* Row 3: perf + short anomaly id */}
                <div className="flex items-center justify-between gap-2 border-t border-[var(--fm-border)] pt-1.5">
                  <span className="text-[10px] font-bold text-[var(--fm-metric)] font-[family-name:var(--font-space-grotesk)] drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
                    ⚡ {entry.route.recalc_duration_ms}ms · TSP recomputed
                  </span>
                  <span
                    className="text-[9px] text-[var(--fm-subtle)] font-[family-name:var(--font-space-grotesk)] opacity-50 truncate max-w-[90px]"
                    title={entry.route.anomaly_id}
                  >
                    {entry.route.anomaly_id.slice(0, 8)}…
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
