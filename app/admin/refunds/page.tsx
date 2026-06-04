"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserSnap = { name: string; email: string } | null;

type RefundRow = {
  id: string;
  service_type: string;
  start_date: string;
  gross_amount: number;
  refund_amount: number;
  penalty_amount: number;
  penalty_direction: string | null;
  refund_policy: string;
  refund_status: string;
  cancelled_by: string;
  cancelled_at: string;
  users: UserSnap | UserSnap[];
  providers: { users: UserSnap | UserSnap[] | null } | { users: UserSnap | UserSnap[] | null }[] | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const POLICY_LABELS: Record<string, string> = {
  full_refund:     "Full Refund (48h+)",
  same_day:        "Full Refund (same-day)",
  penalty_48h:     "15% Penalty (within 48h)",
  mid_engagement:  "Mid-Engagement",
};

const SERVICE_LABELS: Record<string, string> = {
  dog_walking:  "Dog Walking",
  dog_sitting:  "Dog Sitting",
  dog_daycare:  "Dog Daycare",
  dog_boarding: "Dog Overnight",
  dog_grooming: "Dog Grooming",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveArr<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function shortRef(id: string) { return id.replace(/-/g, "").slice(0, 8).toUpperCase(); }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRefundsPage() {
  const ready = useAdminGuard();
  const [rows,    setRows]    = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"pending" | "processed" | "all">("pending");
  const [acting,  setActing]  = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ready) return;
    load(filter);
  }, [ready, filter]);

  async function load(status: string) {
    setLoading(true);
    const res  = await fetch(`/api/admin/refunds?status=${status}`);
    const data = res.ok ? await res.json() : { refunds: [] };
    setRows(data.refunds ?? []);
    setLoading(false);
  }

  async function markProcessed(id: string) {
    setActing(id);
    const res = await fetch("/api/admin/refunds", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, note: noteMap[id] ?? "" }),
    });
    if (res.ok) setRows(prev => prev.map(r => r.id === id ? { ...r, refund_status: "processed" } : r));
    setActing(null);
  }

  const pendingTotal = rows.filter(r => r.refund_status === "pending").reduce((s, r) => s + Number(r.refund_amount), 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Cancellation Refunds</h1>
        {filter === "pending" && pendingTotal > 0 && (
          <p className="mt-2 text-sm font-semibold" style={{ color: "#00b096" }}>
            GHS {pendingTotal.toFixed(2)} pending refunds across {rows.filter(r => r.refund_status === "pending").length} booking{rows.filter(r => r.refund_status === "pending").length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 md:px-8">

        {/* Filter */}
        <div className="flex gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {(["pending", "processed", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition"
              style={filter === f ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-20 text-center">
            <span className="mb-3 text-4xl">✅</span>
            <p className="text-sm font-bold text-gray-500">No {filter === "all" ? "" : filter} refunds.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(r => {
              const owner     = resolveArr(r.users);
              const provSnap  = resolveArr(r.providers);
              const provider  = resolveArr(provSnap?.users ?? null);
              const isPending = r.refund_status === "pending";
              const isBusy    = acting === r.id;

              return (
                <div key={r.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="p-5">

                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-300">#{shortRef(r.id)}</span>
                          <span className="text-sm font-bold" style={{ color: "#0a2e30" }}>
                            {SERVICE_LABELS[r.service_type] ?? r.service_type}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Cancelled by <span className="font-semibold text-gray-600 capitalize">{r.cancelled_by}</span>
                          {" · "}{fmtDate(r.cancelled_at)}
                          {" · "}Service: {fmtDay(r.start_date)}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={isPending
                          ? { backgroundColor: "rgba(251,191,36,.12)", color: "#d97706" }
                          : { backgroundColor: "rgba(16,185,129,.10)", color: "#10b981" }}
                      >
                        {isPending ? "Pending" : "Processed"}
                      </span>
                    </div>

                    {/* Contacts */}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Owner (refund to)</p>
                        <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{owner?.name ?? "—"}</p>
                        {owner?.email && <p className="text-xs text-gray-400">{owner.email}</p>}
                      </div>
                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Provider</p>
                        <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{provider?.name ?? "—"}</p>
                        {provider?.email && <p className="text-xs text-gray-400">{provider.email}</p>}
                      </div>
                    </div>

                    {/* Financials */}
                    <div className="mt-3 flex flex-wrap gap-4 rounded-xl bg-gray-50 px-4 py-3 text-xs">
                      <div>
                        <p className="text-gray-400">Original charge</p>
                        <p className="font-bold" style={{ color: "#0a2e30" }}>GHS {Number(r.gross_amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Refund to owner</p>
                        <p className="font-bold text-emerald-600">GHS {Number(r.refund_amount).toFixed(2)}</p>
                      </div>
                      {Number(r.penalty_amount) > 0 && (
                        <div>
                          <p className="text-gray-400">15% Penalty</p>
                          <p className="font-bold text-amber-600">GHS {Number(r.penalty_amount).toFixed(2)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400">Policy</p>
                        <p className="font-semibold text-gray-600">{POLICY_LABELS[r.refund_policy] ?? r.refund_policy}</p>
                      </div>
                    </div>

                    {/* Penalty direction note */}
                    {r.penalty_direction && (
                      <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
                        <p className="text-xs text-amber-700">
                          {r.penalty_direction === "owner_to_provider"
                            ? `⚠️ Pay GHS ${Number(r.penalty_amount).toFixed(2)} compensation to provider separately.`
                            : `⚠️ Deduct GHS ${Number(r.penalty_amount).toFixed(2)} from provider's next payout as compensation to owner.`}
                        </p>
                      </div>
                    )}

                    {/* Action */}
                    {isPending && (
                      <div className="mt-4 space-y-2">
                        <input
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400"
                          placeholder="Paystack refund reference / note (optional)"
                          value={noteMap[r.id] ?? ""}
                          onChange={e => setNoteMap(prev => ({ ...prev, [r.id]: e.target.value }))}
                        />
                        <button
                          disabled={isBusy}
                          onClick={() => markProcessed(r.id)}
                          className="w-full rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#10b981" }}
                        >
                          {isBusy ? "Updating…" : "✓ Mark Refund as Processed"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
