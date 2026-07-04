"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

type LeaderRow = {
  providerId: string;
  name: string;
  referrals: number;
  active: number;
  earned: number;
  accrued: number;
};

type Stats = {
  totalReferrals: number;
  convertedCount: number;
  conversionRate: number;
  totalAccrued: number;
  totalEarned: number;
  totalVoided: number;
  cashoutPaid: number;
  cashoutPending: number;
  leaderboard: LeaderRow[];
};

export default function AdminReferralsPage() {
  const ready = useAdminGuard();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    fetch("/api/admin/referrals")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data as Stats); setLoading(false); });
  }, [ready]);

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  const s = stats;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const ghs = (n: number) => `GHS ${Number(n).toFixed(2)}`;

  const cards = s ? [
    { label: "Total Referrals",   value: String(s.totalReferrals),        accent: "#0a2e30" },
    { label: "Converted",         value: `${s.convertedCount} · ${pct(s.conversionRate)}`, accent: "#00b096" },
    { label: "Rewards Earned",    value: ghs(s.totalEarned),              accent: "#10b981" },
    { label: "Accruing",          value: ghs(s.totalAccrued),             accent: "#f59e0b" },
    { label: "Paid Out",          value: ghs(s.cashoutPaid),              accent: "#2563eb" },
    { label: "Pending Payout",    value: ghs(s.cashoutPending),           accent: "#d97706" },
  ] : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Referrals</h1>
        <p className="mt-1 text-sm text-white/50">
          Providers earn 5% of every booking by owners they refer, for 12 months.
        </p>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map(c => (
            <div key={c.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-center">
              <p className="text-[11px] font-medium text-gray-400">{c.label}</p>
              <p className="mt-1 text-base font-extrabold" style={{ color: c.accent }}>{c.value}</p>
            </div>
          ))}
        </div>

        {s && s.totalVoided > 0 && (
          <p className="text-xs text-gray-400">
            {ghs(s.totalVoided)} in accruals were voided (cancelled/refunded bookings).
          </p>
        )}

        {/* Leaderboard */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-50 px-5 py-4">
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>Top Referrers</p>
          </div>
          {!s || s.leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
              <span className="mb-3 text-4xl">🎁</span>
              <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>No referrals yet</p>
              <p className="mt-1 text-xs text-gray-400">Provider referral activity will show here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-3 font-semibold">Provider</th>
                    <th className="px-3 py-3 text-right font-semibold">Referred</th>
                    <th className="px-3 py-3 text-right font-semibold">Active</th>
                    <th className="px-3 py-3 text-right font-semibold">Accruing</th>
                    <th className="px-5 py-3 text-right font-semibold">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {s.leaderboard.map(row => (
                    <tr key={row.providerId} className="transition hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold" style={{ color: "#0a2e30" }}>{row.name}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{row.referrals}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{row.active}</td>
                      <td className="px-3 py-3 text-right" style={{ color: "#f59e0b" }}>{ghs(row.accrued)}</td>
                      <td className="px-5 py-3 text-right font-bold" style={{ color: "#10b981" }}>{ghs(row.earned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
