"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";
import { createClient } from "@/lib/supabase";

const SERVICE_LABELS: Record<string, string> = {
  dog_walking:    "Dog Walking",
  pet_sitting:    "Dog Sitting",
  doggy_daycare:  "Dog Daycare",
  dog_boarding:   "Dog Boarding",
  mobile_grooming:"Dog Grooming",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: "Pending",          color: "#d97706", bg: "rgba(251,191,36,.12)" },
  confirmed:         { label: "Confirmed",        color: "#0891b2", bg: "rgba(8,145,178,.10)"  },
  paid:              { label: "Paid",             color: "#059669", bg: "rgba(5,150,105,.10)"  },
  in_progress:       { label: "In Progress",      color: "#6366f1", bg: "rgba(99,102,241,.10)" },
  completed_pending: { label: "Awaiting Confirm", color: "#8b5cf6", bg: "rgba(139,92,246,.10)" },
  closed:            { label: "Closed",           color: "#10b981", bg: "rgba(16,185,129,.10)" },
  cancelled:         { label: "Cancelled",        color: "#dc2626", bg: "rgba(220,38,38,.08)"  },
};

type Booking = {
  id: string;
  service_type: string;
  status: string;
  start_date: string;
  end_date: string;
  gross_amount: number;
  commission_amount: number;
  provider_payout: number;
  created_at: string;
  owner: { name: string } | null;
  provider: { user: { name: string } | null } | null;
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type FilterKey = "all" | "pending" | "confirmed" | "paid" | "in_progress" | "completed_pending" | "closed" | "cancelled";

export default function AdminBookingsPage() {
  const ready   = useAdminGuard();
  const router  = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<FilterKey>("all");

  useEffect(() => {
    if (!ready) return;
    async function load() {
      const sb = createClient();
      const { data } = await sb
        .from("bookings")
        .select(`
          id, service_type, status, start_date, end_date,
          gross_amount, commission_amount, provider_payout, created_at,
          owner:users!bookings_owner_id_fkey(name),
          provider:providers!bookings_provider_id_fkey(user:users!providers_user_id_fkey(name))
        `)
        .order("created_at", { ascending: false });
      setBookings((data ?? []) as unknown as Booking[]);
      setLoading(false);
    }
    load();
  }, [ready]);

  const counts: Record<string, number> = { all: bookings.length };
  for (const b of bookings) counts[b.status] = (counts[b.status] ?? 0) + 1;

  const visible = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const totalGross      = visible.reduce((s, b) => s + Number(b.gross_amount), 0);
  const totalCommission = visible.reduce((s, b) => s + Number(b.commission_amount), 0);

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  const FILTER_KEYS: FilterKey[] = ["all", "pending", "confirmed", "paid", "in_progress", "completed_pending", "closed", "cancelled"];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">All Bookings</h1>
        <p className="mt-1 text-sm text-white/50">
          {visible.length} booking{visible.length !== 1 ? "s" : ""}
          {filter !== "all" ? ` · ${STATUS_META[filter]?.label}` : ""}
          {" "} · GHS {totalGross.toFixed(2)} gross · GHS {totalCommission.toFixed(2)} commission
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-5">

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {FILTER_KEYS.map(f => {
            const meta = f === "all" ? null : STATUS_META[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition"
                style={filter === f ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
              >
                {meta ? meta.label : "All"}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={filter === f
                    ? { backgroundColor: "rgba(255,255,255,.18)", color: "#fff" }
                    : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                  }
                >
                  {counts[f === "all" ? "all" : f] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bookings list */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {visible.map(b => {
              const st           = STATUS_META[b.status] ?? STATUS_META.pending;
              const ownerName    = ((b.owner as unknown) as { name: string } | null)?.name ?? "—";
              const providerName = ((b.provider as unknown) as { user: { name: string } | null } | null)?.user?.name ?? "—";
              const sameDay      = b.start_date === b.end_date;
              return (
                <div
                  key={b.id}
                  onClick={() => router.push(`/booking/${b.id}`)}
                  className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer transition hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: "#0a2e30" }}>
                      {ownerName} → {providerName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {SERVICE_LABELS[b.service_type] ?? b.service_type}
                      {" · "}
                      {sameDay ? fmtDate(b.start_date) : `${fmtDate(b.start_date)} – ${fmtDate(b.end_date)}`}
                    </p>
                    <p className="text-[10px] text-gray-300">Created {fmtDate(b.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
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

            {visible.length === 0 && (
              <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
                <span className="mb-3 text-4xl">📋</span>
                <p className="text-sm text-gray-400">No bookings found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
