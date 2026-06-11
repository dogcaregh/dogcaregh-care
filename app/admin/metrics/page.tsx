"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

// ── Types ──────────────────────────────────────────────────────────────────

type Range = "7d" | "30d" | "month" | "prev";

type Gates = {
  bookings_per_provider: number;
  median_response_hours: number;
  no_response_pct: number;
  repeat_rate: number;
  repeat_eligible: number;
};

type Health = {
  conversion_pct: number;
  acceptance_pct: number;
  cancel_rate_pct: number;
  provider_cancel_pct: number;
  payout_success_pct: number;
  payout_delay_hours: number;
  review_rate_pct: number;
  avg_rating: number;
  new_customers: number;
  gmv: number;
  commission: number;
};

type Provider = {
  id: string;
  name: string;
  hood: string;
  level: number;
  days_live: number;
  completed: number;
  bpp: number;
  resp_hours: number;
  accept_pct: number;
  prov_cancel: number;
  rating: number;
  last_active: string | null;
  chip: "healthy" | "watch" | "risk";
};

type Snapshot = {
  week_start: string;
  metric_key: string;
  value: number;
  gate_status: string;
};

type Incident = {
  id: string;
  created_at: string;
  type: string;
  booking_id: string | null;
  provider_id: string | null;
  description: string;
  status: "open" | "resolved";
  resolved_at: string | null;
  resolution_notes: string | null;
};

type MetricsData = {
  gates: Gates;
  health: Health;
  providers: Provider[];
  volume: number;
  snapshots: Snapshot[];
  incidents: Incident[];
};

// ── Constants ──────────────────────────────────────────────────────────────

const INCIDENT_TYPES = [
  "safety_dog", "safety_person", "provider_conduct",
  "provider_no_show", "payment_dispute", "other",
] as const;

const INCIDENT_LABELS: Record<string, string> = {
  safety_dog:       "Dog Safety",
  safety_person:    "Person Safety",
  provider_conduct: "Provider Conduct",
  provider_no_show: "No Show",
  payment_dispute:  "Payment Dispute",
  other:            "Other",
};

const INCIDENT_STYLES: Record<string, { bg: string; color: string }> = {
  safety_dog:       { bg: "rgba(220,38,38,.12)",   color: "#dc2626" },
  safety_person:    { bg: "rgba(220,38,38,.12)",   color: "#dc2626" },
  provider_conduct: { bg: "rgba(234,88,12,.12)",   color: "#ea580c" },
  provider_no_show: { bg: "rgba(245,158,11,.12)",  color: "#d97706" },
  payment_dispute:  { bg: "rgba(37,99,235,.12)",   color: "#2563eb" },
  other:            { bg: "rgba(107,114,128,.12)", color: "#6b7280" },
};

const BLOCKING_TYPES = ["safety_dog", "safety_person", "provider_conduct"];

// ── Helpers ────────────────────────────────────────────────────────────────

function getRange(r: Range): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString();
  if (r === "7d")  return { from: fmt(new Date(now.getTime() - 7  * 86400_000)), to: fmt(now) };
  if (r === "30d") return { from: fmt(new Date(now.getTime() - 30 * 86400_000)), to: fmt(now) };
  if (r === "month") {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  }
  // prev month
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  return { from: fmt(from), to: fmt(to) };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtHours(h: number): string {
  if (h < 0)  return "—";
  if (h === 0) return "—";
  if (h < 1)  return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

// ── Sparkline ─────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-6 w-16" />;
  const w = 64, h = 20, pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke="#00b096" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Gate card ─────────────────────────────────────────────────────────────

function GateCard({
  title, value, display, sub, threshold, green, sparkValues,
}: {
  title: string;
  value: number;
  display: string;
  sub?: string;
  threshold: string;
  green: boolean;
  sparkValues: number[];
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">{title}</p>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-3xl font-extrabold leading-none ${green ? "text-emerald-600" : "text-red-600"}`}>
            {display}
          </p>
          {sub && <p className="mt-1 text-[10px] text-gray-400 leading-snug">{sub}</p>}
          <p className="mt-1.5 text-[10px] text-gray-400">threshold: {threshold}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            green ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}>
            {green ? "GREEN" : "RED"}
          </span>
          <Sparkline values={sparkValues} />
        </div>
      </div>
    </div>
  );
}

// ── Health rows ────────────────────────────────────────────────────────────

function healthRows(h: Health) {
  return [
    { label: "Quote → booking conversion", val: `${h.conversion_pct.toFixed(1)}%`,        target: "≥ 40%", flag: h.conversion_pct < 40 },
    { label: "Provider acceptance rate",   val: `${h.acceptance_pct.toFixed(1)}%`,        target: "≥ 80%", flag: h.acceptance_pct < 80 },
    { label: "Cancellation rate",          val: `${h.cancel_rate_pct.toFixed(1)}%`,       target: "≤ 10%", flag: h.cancel_rate_pct > 10 },
    { label: "— Provider-initiated",       val: `${h.provider_cancel_pct.toFixed(1)}% of cancels`, target: "≤ 30%", flag: h.provider_cancel_pct > 30 },
    { label: "Payout success rate",        val: `${h.payout_success_pct.toFixed(1)}%`,    target: "100%",  flag: h.payout_success_pct < 100 },
    { label: "Median payout processing",   val: fmtHours(h.payout_delay_hours),           target: "≤ 48h", flag: h.payout_delay_hours > 48 },
    { label: "Review rate",                val: `${h.review_rate_pct.toFixed(1)}%`,       target: "≥ 70%", flag: h.review_rate_pct < 70 },
    { label: "Average rating",             val: h.avg_rating > 0 ? h.avg_rating.toFixed(2) : "—", target: "≥ 4.5", flag: h.avg_rating > 0 && h.avg_rating < 4.5 },
    { label: "New customers",              val: String(h.new_customers),                  target: "—",     flag: false },
    { label: "GMV",                        val: `GHS ${Number(h.gmv).toFixed(2)}`,        target: "—",     flag: false },
    { label: "Platform revenue (25%)",     val: `GHS ${Number(h.commission).toFixed(2)}`, target: "—",     flag: false },
  ];
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AdminMetricsPage() {
  const ready = useAdminGuard();

  const [range,   setRange]   = useState<Range>("30d");
  const [data,    setData]    = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  // Log incident modal
  const [showLog,   setShowLog]   = useState(false);
  const [logType,   setLogType]   = useState("other");
  const [logDesc,   setLogDesc]   = useState("");
  const [logBookId, setLogBookId] = useState("");
  const [logging,   setLogging]   = useState(false);

  // Inline resolve
  const [resolveId,   setResolveId]   = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolving,   setResolving]   = useState(false);

  const fetchData = useCallback((r: Range) => {
    const { from, to } = getRange(r);
    setLoading(true);
    setErr(null);
    fetch(`/api/admin/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(res => res.ok ? res.json() : res.json().then((e: any) => Promise.reject(e.error)))
      .then((d: MetricsData) => { setData(d); setLoading(false); })
      .catch((e: unknown) => { setErr(String(e)); setLoading(false); });
  }, []);

  useEffect(() => { if (ready) fetchData(range); }, [ready, range, fetchData]);

  async function submitIncident() {
    if (!logDesc.trim()) return;
    setLogging(true);
    const res = await fetch("/api/admin/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: logType, description: logDesc.trim(), booking_id: logBookId || null }),
    });
    if (res.ok) {
      setShowLog(false); setLogDesc(""); setLogType("other"); setLogBookId("");
      fetchData(range);
    }
    setLogging(false);
  }

  async function submitResolve(id: string) {
    setResolving(true);
    await fetch("/api/admin/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolution_notes: resolveNote || null }),
    });
    setResolveId(null); setResolveNote("");
    fetchData(range);
    setResolving(false);
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const snapshots   = data?.snapshots ?? [];
  const incidents   = data?.incidents ?? [];
  const openInc     = incidents.filter(i => i.status === "open");
  const blockingInc = openInc.filter(i => BLOCKING_TYPES.includes(i.type));

  const weeks = Array.from(new Set(snapshots.map(s => s.week_start))).sort().reverse().slice(0, 2);
  const weeklyGreen = weeks.map(w => {
    const ws = snapshots.filter(s => s.week_start === w);
    return (
      ws.find(s => s.metric_key === "gate_bpp")?.gate_status            === "green" &&
      ws.find(s => s.metric_key === "gate_response_hours")?.gate_status === "green" &&
      ws.find(s => s.metric_key === "gate_no_response_pct")?.gate_status === "green" &&
      ws.find(s => s.metric_key === "gate_repeat_rate")?.gate_status    === "green"
    );
  });
  const isGo = weeks.length >= 2 && weeklyGreen.every(Boolean) && blockingInc.length === 0;
  let holdReason = "";
  if (!isGo) {
    if (blockingInc.length > 0)   holdReason = `${blockingInc.length} open safety/conduct incident(s)`;
    else if (weeks.length < 2)    holdReason = "Insufficient snapshot history — check back after Sunday";
    else if (!weeklyGreen[0])     holdReason = "One or more gates red this week";
    else                          holdReason = "One or more gates red last week";
  }

  const sparkFor = (key: string) =>
    Array.from(new Set(snapshots.map(s => s.week_start))).sort()
      .map(w => snapshots.find(s => s.week_start === w && s.metric_key === key)?.value ?? 0);

  const g   = data?.gates;
  const h   = data?.health;
  const vol = data?.volume ?? 0;

  // ── Render ───────────────────────────────────────────────────────────────

  if (!ready) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      {/* Header + date range */}
      <div style={{ backgroundColor: "#0a2e30" }} className="px-6 py-4 md:px-12">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-base font-extrabold text-white">Metrics Dashboard</h1>
          <div className="flex gap-1.5 flex-wrap">
            {(["7d", "30d", "month", "prev"] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  range === r ? "bg-[#00b096] text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {r === "7d" ? "7 days" : r === "30d" ? "30 days" : r === "month" ? "This month" : "Prev month"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 md:px-12 space-y-5">
        {/* Loading / error */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00b096] border-t-transparent" />
            Loading metrics…
          </div>
        )}
        {err && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{err}</div>}

        {data && !loading && (
          <>
            {/* GO / HOLD banner */}
            <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
              isGo ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            }`}>
              <span className="text-2xl leading-none">{isGo ? "🟢" : "🔴"}</span>
              <div>
                <p className={`text-sm font-bold ${isGo ? "text-emerald-800" : "text-red-800"}`}>
                  EXPANSION: {isGo ? "GO" : "HOLD"}
                </p>
                {!isGo && <p className="text-xs mt-0.5 text-red-600">{holdReason}</p>}
              </div>
            </div>

            {/* Gate cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <GateCard
                title="Bookings / Provider / Month"
                value={g?.bookings_per_provider ?? 0}
                display={(g?.bookings_per_provider ?? 0).toFixed(1)}
                threshold="≥ 5.0"
                green={(g?.bookings_per_provider ?? 0) >= 5}
                sparkValues={sparkFor("gate_bpp")}
              />
              <GateCard
                title="Median Response Time"
                value={g?.median_response_hours ?? 0}
                display={fmtHours(g?.median_response_hours ?? 0)}
                sub={`${(g?.no_response_pct ?? 0).toFixed(1)}% no response within 48h`}
                threshold="< 4h · < 10% no-response"
                green={(g?.median_response_hours ?? 99) < 4 && (g?.no_response_pct ?? 100) < 10}
                sparkValues={sparkFor("gate_response_hours")}
              />
              <GateCard
                title="Repeat Booking Rate"
                value={g?.repeat_rate ?? 0}
                display={`${(g?.repeat_rate ?? 0).toFixed(1)}%`}
                sub={
                  (g?.repeat_eligible ?? 0) < 15
                    ? `⚠ Only ${g?.repeat_eligible ?? 0} eligible customers`
                    : `${g?.repeat_eligible ?? 0} eligible customers`
                }
                threshold="≥ 30%"
                green={(g?.repeat_rate ?? 0) >= 30}
                sparkValues={sparkFor("gate_repeat_rate")}
              />
            </div>

            {/* Low-volume caution */}
            {vol < 20 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
                <span className="text-amber-500 text-sm">⚠</span>
                <p className="text-xs text-amber-700 font-medium">
                  Low volume — only {vol} completed booking{vol !== 1 ? "s" : ""} in this period. Read these numbers with caution.
                </p>
              </div>
            )}

            {/* Health metrics */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-[#0a2e30]">Health Metrics</h2>
              </div>
              {h && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-5 py-2 text-left text-[11px] font-semibold text-gray-400">Metric</th>
                      <th className="px-5 py-2 text-right text-[11px] font-semibold text-gray-400">Value</th>
                      <th className="px-5 py-2 text-right text-[11px] font-semibold text-gray-400 hidden sm:table-cell">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthRows(h).map((row, i) => (
                      <tr key={i} className={`border-b border-gray-50 last:border-0 ${row.flag ? "bg-red-50/40" : ""}`}>
                        <td className="px-5 py-2.5 text-gray-600">{row.label}</td>
                        <td className={`px-5 py-2.5 text-right font-semibold ${row.flag ? "text-red-600" : "text-gray-800"}`}>
                          {row.val}
                        </td>
                        <td className="px-5 py-2.5 text-right text-xs text-gray-400 hidden sm:table-cell">{row.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Red flags / incidents */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0a2e30]">Red Flags</h2>
                  {openInc.length > 0 && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{openInc.length} open · {incidents.filter(i => i.status === "resolved").length} resolved</p>
                  )}
                </div>
                <button
                  onClick={() => setShowLog(true)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "#0a2e30" }}
                >
                  + Log Incident
                </button>
              </div>

              {openInc.length === 0 ? (
                <p className="px-5 py-5 text-xs text-gray-400 text-center">No open incidents.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {openInc.map(inc => (
                    <div key={inc.id} className="px-5 py-3 flex items-start gap-3">
                      <span
                        className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                        style={INCIDENT_STYLES[inc.type] ?? INCIDENT_STYLES.other}
                      >
                        {INCIDENT_LABELS[inc.type] ?? inc.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-700 leading-relaxed">{inc.description}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(inc.created_at)}</p>
                      </div>
                      {resolveId === inc.id ? (
                        <div className="shrink-0 flex flex-col gap-1.5 min-w-[160px]">
                          <input
                            value={resolveNote}
                            onChange={e => setResolveNote(e.target.value)}
                            placeholder="Resolution note…"
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-full"
                          />
                          <button
                            onClick={() => submitResolve(inc.id)}
                            disabled={resolving}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-40"
                          >
                            {resolving ? "Resolving…" : "Confirm resolve ✓"}
                          </button>
                          <button onClick={() => { setResolveId(null); setResolveNote(""); }} className="text-xs text-gray-400 hover:text-gray-600">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setResolveId(inc.id); setResolveNote(""); }}
                          className="shrink-0 text-xs text-gray-400 hover:text-gray-700 transition"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Provider drill-down */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-[#0a2e30]">Provider Drill-Down</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">🔴 call this week · 🟡 watch · 🟢 healthy</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-4 py-2 text-left font-semibold text-gray-400">Provider</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-400">Bookings</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-400 hidden sm:table-cell">Resp.</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-400 hidden md:table-cell">Accept.</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-400 hidden md:table-cell">Cancels</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-400">Rating</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-400 hidden sm:table-cell">Last Active</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.providers ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No approved providers yet.</td>
                      </tr>
                    ) : (data.providers ?? []).map(p => (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          <p className="text-gray-400">{p.hood} · L{p.level} · {p.days_live}d live</p>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <p className="font-semibold text-gray-800">{p.completed}</p>
                          <p className="text-gray-400">{Number(p.bpp).toFixed(1)}/mo</p>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 hidden sm:table-cell">
                          {fmtHours(p.resp_hours)}
                        </td>
                        <td className={`px-4 py-2.5 text-right hidden md:table-cell font-semibold ${
                          p.accept_pct < 50 ? "text-red-600" : p.accept_pct < 70 ? "text-amber-600" : "text-gray-700"
                        }`}>
                          {Number(p.accept_pct).toFixed(0)}%
                        </td>
                        <td className={`px-4 py-2.5 text-right hidden md:table-cell ${
                          p.prov_cancel >= 2 ? "text-red-600 font-semibold" : "text-gray-700"
                        }`}>
                          {p.prov_cancel}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">
                          {Number(p.rating) > 0 ? Number(p.rating).toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-400 hidden sm:table-cell">
                          {p.last_active ? fmtDate(p.last_active) : "never"}
                        </td>
                        <td className="px-4 py-2.5 text-center text-base">
                          {p.chip === "risk" ? "🔴" : p.chip === "watch" ? "🟡" : "🟢"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log incident modal */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-[#0a2e30] mb-4">Log Incident</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                <select
                  value={logType}
                  onChange={e => setLogType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                >
                  {INCIDENT_TYPES.map(t => (
                    <option key={t} value={t}>{INCIDENT_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  value={logDesc}
                  onChange={e => setLogDesc(e.target.value)}
                  rows={3}
                  placeholder="What happened?"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Booking ID (optional)</label>
                <input
                  value={logBookId}
                  onChange={e => setLogBookId(e.target.value)}
                  placeholder="Leave blank if not booking-specific"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setShowLog(false); setLogDesc(""); setLogType("other"); setLogBookId(""); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitIncident}
                disabled={!logDesc.trim() || logging}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#dc2626" }}
              >
                {logging ? "Logging…" : "Log Incident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
