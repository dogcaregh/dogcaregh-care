"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

type TxType = "payment" | "cashout";
type FilterKey = "all" | "payment" | "cashout";

type Transaction = {
  id: string;
  type: TxType;
  date: string;
  amount: number;
  commission: number;
  payout: number;
  status: string;
  ref: string | null;
  service: string;
  from: string;
  to: string;
  bookingId: string | null;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  paid:              { label: "Paid",             color: "#10b981", bg: "rgba(16,185,129,.10)"  },
  in_progress:       { label: "In Progress",      color: "#2563eb", bg: "rgba(37,99,235,.10)"  },
  completed_pending: { label: "Pending Confirm",  color: "#0284c7", bg: "rgba(2,132,199,.10)"  },
  closed:            { label: "Settled",          color: "#059669", bg: "rgba(5,150,105,.10)"   },
  pending:           { label: "Pending",          color: "#f59e0b", bg: "rgba(245,158,11,.10)"  },
  rejected:          { label: "Rejected",         color: "#dc2626", bg: "rgba(220,38,38,.08)"   },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminTransactionsPage() {
  const ready   = useAdminGuard();
  const router  = useRouter();
  const [txs,     setTxs]     = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterKey>("all");
  const [totals,  setTotals]  = useState({ in: 0, out: 0, commission: 0 });

  useEffect(() => {
    if (!ready) return;
    fetch("/api/admin/transactions")
      .then(r => r.json())
      .then(({ transactions, totalIn, totalOut, totalCommission }) => {
        setTxs(transactions ?? []);
        setTotals({ in: totalIn ?? 0, out: totalOut ?? 0, commission: totalCommission ?? 0 });
        setLoading(false);
      });
  }, [ready]);

  const visible = filter === "all" ? txs : txs.filter(t => t.type === filter);

  const counts = {
    all:     txs.length,
    payment: txs.filter(t => t.type === "payment").length,
    cashout: txs.filter(t => t.type === "cashout").length,
  };

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
        <h1 className="mt-1 text-2xl font-extrabold text-white">Transactions</h1>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Revenue In",         value: `GHS ${totals.in.toFixed(2)}`,         color: "#10b981" },
            { label: "Payouts Out",        value: `GHS ${totals.out.toFixed(2)}`,        color: "#f59e0b" },
            { label: "Platform Commission",value: `GHS ${totals.commission.toFixed(2)}`, color: "#2563eb" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: "rgba(255,255,255,.06)" }}>
              <p className="text-[11px] font-medium text-white/50">{s.label}</p>
              <p className="mt-1 text-lg font-extrabold sm:text-xl" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-5">

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {(["all", "payment", "cashout"] as FilterKey[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold capitalize transition"
              style={filter === f ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
            >
              {f === "payment" ? "Payments In" : f === "cashout" ? "Cashouts Out" : "All"}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={filter === f
                  ? { backgroundColor: "rgba(255,255,255,.18)", color: "#fff" }
                  : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                }
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
              <span className="mb-3 text-4xl">💸</span>
              <p className="text-sm text-gray-400">No transactions found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {visible.map(tx => {
                const st = STATUS_META[tx.status] ?? STATUS_META.pending;
                const isPayment = tx.type === "payment";
                return (
                  <div
                    key={tx.id}
                    className={`flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-gray-50 ${tx.bookingId ? "cursor-pointer" : ""}`}
                    onClick={() => tx.bookingId && router.push(`/booking/${tx.bookingId}`)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type icon */}
                      <div
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
                        style={isPayment
                          ? { backgroundColor: "rgba(16,185,129,.1)", color: "#10b981" }
                          : { backgroundColor: "rgba(245,158,11,.1)", color: "#f59e0b" }
                        }
                      >
                        {isPayment ? "↓" : "↑"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>
                            {tx.from} → {tx.to}
                          </p>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{tx.service}</p>
                        {tx.ref && <p className="text-[10px] font-mono text-gray-300">{tx.ref}</p>}
                        <p className="text-[10px] text-gray-300">{fmtDate(tx.date)} · {fmtTime(tx.date)}</p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className="text-sm font-extrabold"
                        style={{ color: isPayment ? "#10b981" : "#f59e0b" }}
                      >
                        {isPayment ? "+" : "−"} GHS {tx.amount.toFixed(2)}
                      </p>
                      {isPayment && (
                        <>
                          <p className="text-[10px] text-gray-400">
                            comm GHS {tx.commission.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            payout GHS {tx.payout.toFixed(2)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
