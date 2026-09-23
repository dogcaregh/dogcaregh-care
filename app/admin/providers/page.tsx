"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";
import Link from "next/link";

type ProviderRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  verified: boolean;
  active: boolean;
  rating_avg: number;
  review_count: number;
  total_bookings: number;
  completed_sessions: number;
  total_earned: number;
  total_cashed_out: number;
  balance: number;
};

function GHS(n: number) {
  return `GHS ${n.toFixed(2)}`;
}

export default function AdminProvidersPage() {
  const ready = useAdminGuard();
  const [rows,    setRows]    = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState<"balance" | "bookings" | "completed" | "name">("balance");
  const [dir,     setDir]     = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (!ready) return;
    fetch("/api/admin/providers")
      .then(r => r.json())
      .then(({ providers }) => {
        setRows(providers ?? []);
        setLoading(false);
      });
  }, [ready]);

  function toggleSort(col: typeof sort) {
    if (sort === col) {
      setDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSort(col);
      setDir("desc");
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      : rows;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort === "balance")   cmp = a.balance           - b.balance;
      if (sort === "bookings")  cmp = a.total_bookings     - b.total_bookings;
      if (sort === "completed") cmp = a.completed_sessions - b.completed_sessions;
      if (sort === "name")      cmp = a.name.localeCompare(b.name);
      return dir === "desc" ? -cmp : cmp;
    });
  }, [rows, search, sort, dir]);

  const totals = useMemo(() => ({
    earned:    rows.reduce((s, r) => s + r.total_earned,    0),
    cashed:    rows.reduce((s, r) => s + r.total_cashed_out, 0),
    balance:   rows.reduce((s, r) => s + r.balance,          0),
    bookings:  rows.reduce((s, r) => s + r.total_bookings,   0),
    completed: rows.reduce((s, r) => s + r.completed_sessions, 0),
  }), [rows]);

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  function SortIcon({ col }: { col: typeof sort }) {
    if (sort !== col) return <span className="text-white/20">↕</span>;
    return <span style={{ color: "#00b096" }}>{dir === "desc" ? "↓" : "↑"}</span>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Provider Earnings</h1>
        <p className="mt-1 text-sm text-white/50">{rows.length} providers · {totals.bookings} total bookings · {totals.completed} completed sessions</p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Earned",    value: GHS(totals.earned),   accent: "#10b981" },
            { label: "Total Cashed Out", value: GHS(totals.cashed),  accent: "#f59e0b" },
            { label: "Outstanding Balance", value: GHS(totals.balance), accent: "#2563eb" },
            { label: "Completed Sessions",  value: totals.completed,  accent: "#00b096" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-medium text-gray-400">{s.label}</p>
              <p className="mt-1 text-xl font-extrabold" style={{ color: s.accent }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-gray-100 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00b096]/30"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_80px] gap-3 border-b border-gray-100 px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            <button className="text-left flex items-center gap-1" onClick={() => toggleSort("name")}>
              Provider <SortIcon col="name" />
            </button>
            <button className="text-right flex items-center justify-end gap-1" onClick={() => toggleSort("bookings")}>
              Bookings <SortIcon col="bookings" />
            </button>
            <button className="text-right flex items-center justify-end gap-1" onClick={() => toggleSort("completed")}>
              Completed <SortIcon col="completed" />
            </button>
            <span className="text-right">Total Earned</span>
            <span className="text-right">Cashed Out</span>
            <button className="text-right flex items-center justify-end gap-1" onClick={() => toggleSort("balance")}>
              Balance <SortIcon col="balance" />
            </button>
            <span />
          </div>

          <div className="divide-y divide-gray-50">
            {visible.map(r => (
              <div
                key={r.id}
                className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_80px] gap-3 items-center px-5 py-4 transition hover:bg-gray-50"
              >
                {/* Provider info */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: "#0a2e30" }}>{r.name}</p>
                    {r.verified && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(16,185,129,.1)", color: "#10b981" }}>
                        Verified
                      </span>
                    )}
                    {!r.active && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(220,38,38,.08)", color: "#dc2626" }}>
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{r.email}</p>
                  {r.review_count > 0 && (
                    <p className="text-[10px] text-gray-300">★ {Number(r.rating_avg).toFixed(1)} · {r.review_count} reviews</p>
                  )}
                  {/* Mobile stats */}
                  <div className="mt-2 flex flex-wrap gap-3 sm:hidden text-xs text-gray-500">
                    <span><span className="font-semibold text-gray-700">{r.total_bookings}</span> bookings</span>
                    <span><span className="font-semibold text-gray-700">{r.completed_sessions}</span> completed</span>
                    <span>Earned <span className="font-semibold" style={{ color: "#10b981" }}>{GHS(r.total_earned)}</span></span>
                    <span>Cashed <span className="font-semibold text-gray-700">{GHS(r.total_cashed_out)}</span></span>
                    <span>Balance <span className="font-extrabold" style={{ color: r.balance > 0 ? "#2563eb" : "#9ca3af" }}>{GHS(r.balance)}</span></span>
                  </div>
                  <Link
                    href={`/admin/users/${r.user_id}`}
                    className="mt-2 inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-50 sm:hidden"
                  >
                    View →
                  </Link>
                </div>

                {/* Desktop columns */}
                <p className="hidden sm:block text-sm font-semibold text-right" style={{ color: "#0a2e30" }}>
                  {r.total_bookings}
                </p>
                <p className="hidden sm:block text-sm font-semibold text-right" style={{ color: "#0a2e30" }}>
                  {r.completed_sessions}
                </p>
                <p className="hidden sm:block text-sm font-semibold text-right" style={{ color: "#10b981" }}>
                  {GHS(r.total_earned)}
                </p>
                <p className="hidden sm:block text-sm text-right text-gray-500">
                  {GHS(r.total_cashed_out)}
                </p>
                <p
                  className="hidden sm:block text-sm font-extrabold text-right"
                  style={{ color: r.balance > 0 ? "#2563eb" : "#9ca3af" }}
                >
                  {GHS(r.balance)}
                </p>

                {/* Actions */}
                <div className="hidden sm:flex justify-end gap-2">
                  <Link
                    href={`/admin/users/${r.user_id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-50"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}

            {visible.length === 0 && (
              <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
                <span className="mb-3 text-4xl">🐾</span>
                <p className="text-sm text-gray-400">No providers match your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
