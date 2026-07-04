"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

// ─── Types ────────────────────────────────────────────────────────────────────

type CashoutRow = {
  id: string;
  amount: number;
  momo_network: string;
  momo_number: string;
  status: "pending" | "paid" | "rejected";
  note: string | null;
  created_at: string;
  paid_at: string | null;
  source: "earnings" | "referral";
  providers: {
    user_id: string;
    users: { name: string; email: string } | { name: string; email: string }[] | null;
  } | {
    user_id: string;
    users: { name: string; email: string } | { name: string; email: string }[] | null;
  }[] | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MOMO_LABELS: Record<string, string> = {
  mtn:         "MTN MoMo",
  vodafone:    "Telecel Cash",
  airtel_tigo: "AirtelTigo Money",
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending:  { color: "#d97706", bg: "rgba(251,191,36,.12)" },
  paid:     { color: "#10b981", bg: "rgba(16,185,129,.10)" },
  rejected: { color: "#dc2626", bg: "rgba(220,38,38,.08)"  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveArr<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCashoutsPage() {
  const ready = useAdminGuard();
  const [rows,    setRows]    = useState<CashoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"pending" | "paid" | "rejected" | "all">("pending");
  const [acting,  setActing]  = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ready) return;
    fetch("/api/admin/cashouts")
      .then(r => r.json())
      .then(({ cashouts }) => {
        setRows((cashouts ?? []) as CashoutRow[]);
        setLoading(false);
      });
  }, [ready]);

  async function act(id: string, status: "paid" | "rejected") {
    setActing(id);
    const res = await fetch("/api/admin/cashouts", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, status, note: noteMap[id] ?? "" }),
    });
    if (res.ok) {
      setRows(prev => prev.map(r =>
        r.id === id
          ? { ...r, status, note: noteMap[id]?.trim() || r.note, paid_at: status === "paid" ? new Date().toISOString() : r.paid_at }
          : r
      ));
    }
    setActing(null);
  }

  const filtered      = rows.filter(r => filter === "all" || r.status === filter);
  const pendingTotal  = rows.filter(r => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
  const pendingCount  = rows.filter(r => r.status === "pending").length;

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Provider Withdrawals</h1>
        {pendingTotal > 0 && (
          <p className="mt-2 text-sm font-semibold" style={{ color: "#00b096" }}>
            GHS {pendingTotal.toFixed(2)} pending across {pendingCount} request{pendingCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 md:px-8">

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {(["pending", "paid", "rejected", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition"
              style={filter === f ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
            >
              {f} {f !== "all" && `(${rows.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-20 text-center">
            <span className="mb-3 text-4xl">💸</span>
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>
              No {filter === "all" ? "" : filter} requests
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const provSnap  = resolveArr(r.providers);
              const provUser  = resolveArr(provSnap?.users ?? null);
              const provName  = (provUser as { name: string } | null)?.name ?? "Provider";
              const st        = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
              const isBusy    = acting === r.id;

              return (
                <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-base font-extrabold" style={{ color: "#0a2e30" }}>
                          GHS {Number(r.amount).toFixed(2)}
                        </p>
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {r.status}
                        </span>
                        {r.source === "referral" && (
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{ backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }}
                          >
                            🎁 Referral
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-700">{provName}</p>
                      <p className="text-xs text-gray-400">
                        {MOMO_LABELS[r.momo_network] ?? r.momo_network}
                        {" · "}
                        <span className="font-mono">{r.momo_number}</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-400">Requested {fmtDate(r.created_at)}</p>
                      {r.paid_at && <p className="text-xs text-gray-400">Paid {fmtDate(r.paid_at)}</p>}
                      {r.note && (
                        <p className="mt-1 text-xs italic text-gray-500">{r.note}</p>
                      )}
                    </div>
                  </div>

                  {r.status === "pending" && (
                    <div className="mt-4 space-y-2">
                      <input
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:bg-white focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400"
                        placeholder="Reference / note to provider (optional)"
                        value={noteMap[r.id] ?? ""}
                        onChange={e => setNoteMap(prev => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => act(r.id, "paid")}
                          disabled={isBusy}
                          className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#10b981" }}
                        >
                          {isBusy ? "Updating…" : "✓ Mark as Paid"}
                        </button>
                        <button
                          onClick={() => act(r.id, "rejected")}
                          disabled={isBusy}
                          className="flex-1 rounded-xl border border-red-200 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                      <p className="text-center text-[10px] text-gray-400">
                        Provider will be notified by in-app notification and email.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
