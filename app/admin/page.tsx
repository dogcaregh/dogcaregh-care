"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

const SERVICE_LABELS: Record<string, string> = {
  dog_walking:    "Dog Walking",
  pet_sitting:    "Dog Sitting",
  doggy_daycare:  "Dog Daycare",
  dog_boarding:   "Dog Boarding",
  mobile_grooming:"Dog Grooming",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: "Pending",            color: "#d97706", bg: "rgba(251,191,36,.12)" },
  confirmed:         { label: "Confirmed",          color: "#0891b2", bg: "rgba(8,145,178,.10)"  },
  paid:              { label: "Paid",               color: "#059669", bg: "rgba(5,150,105,.10)"  },
  in_progress:       { label: "In Progress",        color: "#6366f1", bg: "rgba(99,102,241,.10)" },
  completed_pending: { label: "Awaiting Confirm",   color: "#8b5cf6", bg: "rgba(139,92,246,.10)" },
  closed:            { label: "Closed",             color: "#10b981", bg: "rgba(16,185,129,.10)" },
  cancelled:         { label: "Cancelled",          color: "#dc2626", bg: "rgba(220,38,38,.08)"  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type RecentBooking = {
  id: string;
  service_type: string;
  status: string;
  gross_amount: number;
  commission_amount: number;
  created_at: string;
  owner: { name: string } | null;
  provider: { user: { name: string } | null } | null;
};

type Stats = {
  owners: number;
  providers: number;
  bookings: number;
  pendingCashouts: number;
  totalRevenue: number;
  totalCommission: number;
  bookingsByStatus: Record<string, number>;
};

export default function AdminOverviewPage() {
  const ready = useAdminGuard();
  const router = useRouter();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [recent,  setRecent]  = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(data => {
        setStats({
          owners:           data.owners,
          providers:        data.providers,
          bookings:         data.bookings,
          pendingCashouts:  data.pendingCashouts,
          totalRevenue:     data.totalRevenue,
          totalCommission:  data.totalCommission,
          bookingsByStatus: data.bookingsByStatus,
        });
        setRecent(data.recentBookings as RecentBooking[]);
        setLoading(false);
      });
  }, [ready]);

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  const STAT_CARDS = [
    { label: "Total Owners",      value: stats!.owners,                              accent: "#00b096", href: "/admin/users?role=owner"    },
    { label: "Total Providers",   value: stats!.providers,                           accent: "#6366f1", href: "/admin/users?role=provider"  },
    { label: "Total Bookings",    value: stats!.bookings,                            accent: "#0891b2", href: "/admin/bookings"             },
    { label: "Pending Cashouts",  value: stats!.pendingCashouts,                     accent: "#f59e0b", href: "/admin/cashouts"             },
    { label: "Platform Revenue",  value: `GHS ${stats!.totalRevenue.toFixed(2)}`,    accent: "#10b981", href: "/admin/bookings?status=closed"},
    { label: "Platform Commission",value:`GHS ${stats!.totalCommission.toFixed(2)}`, accent: "#8b5cf6", href: "/admin/bookings?status=closed"},
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">Platform Overview</h1>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAT_CARDS.map(s => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <p className="text-[11px] font-medium text-gray-400">{s.label}</p>
              <p className="mt-1 text-xl font-extrabold" style={{ color: s.accent }}>{s.value}</p>
            </Link>
          ))}
        </div>

        {/* Booking status breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold" style={{ color: "#0a2e30" }}>Bookings by Status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_META).map(([status, meta]) => {
              const count = stats!.bookingsByStatus[status] ?? 0;
              return (
                <Link
                  key={status}
                  href={`/admin/bookings?status=${status}`}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 transition hover:opacity-80"
                  style={{ borderColor: meta.color + "33", backgroundColor: meta.bg }}
                >
                  <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-sm font-extrabold" style={{ color: meta.color }}>{count}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent bookings */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>Recent Bookings</p>
            <Link href="/admin/bookings" className="text-xs font-semibold hover:underline" style={{ color: "#00b096" }}>
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.map(b => {
              const st = STATUS_META[b.status] ?? STATUS_META.pending;
              const ownerName    = ((b.owner as unknown) as { name: string } | null)?.name ?? "—";
              const providerName = ((b.provider as unknown) as { user: { name: string } | null } | null)?.user?.name ?? "—";
              return (
                <div
                  key={b.id}
                  onClick={() => router.push(`/booking/${b.id}`)}
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer transition hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>
                      {ownerName} → {providerName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {SERVICE_LABELS[b.service_type] ?? b.service_type} · {fmtDate(b.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: "#0a2e30" }}>GHS {Number(b.gross_amount).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">comm GHS {Number(b.commission_amount).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nav cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/transactions", label: "Transactions",     desc: "Unified money ledger — payments in and cashouts out", accent: "#10b981" },
            { href: "/admin/users",        label: "Manage Users",     desc: "View all owners and providers, verify providers",     accent: "#6366f1" },
            { href: "/admin/bookings",     label: "All Bookings",     desc: "Filter and browse every booking on the platform",     accent: "#0891b2" },
            { href: "/admin/cashouts",     label: "Cashout Requests", desc: "Process pending provider withdrawal requests",        accent: "#f59e0b" },
          ].map(c => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <p className="text-sm font-extrabold" style={{ color: c.accent }}>{c.label}</p>
              <p className="mt-1 text-xs text-gray-400">{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
