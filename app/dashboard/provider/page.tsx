"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useChat } from "@/lib/chat-context";

// ── Types ──────────────────────────────────────────────────────────────────

type BookingStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "in_progress"
  | "completed_pending"
  | "closed"
  | "cancelled";

type ServiceId =
  | "pet_sitting"
  | "doggy_daycare"
  | "dog_boarding"
  | "mobile_grooming"
  | "dog_walking";

type Booking = {
  id: string;
  owner_id: string;
  service_type: ServiceId;
  start_date: string;
  end_date: string;
  gross_amount: number;
  provider_payout: number;
  status: BookingStatus;
  created_at: string;
  users: { name: string; location: string | null; avatar_url: string | null } | { name: string; location: string | null; avatar_url: string | null }[] | null;
  dogs: { name: string; breed: string | null; size: string | null }
      | { name: string; breed: string | null; size: string | null }[]
      | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

const SERVICES: Record<ServiceId, { label: string; emoji: string }> = {
  pet_sitting:     { label: "Pet Sitting",     emoji: "🐾" },
  doggy_daycare:   { label: "Doggy Daycare",   emoji: "🏡" },
  dog_boarding:    { label: "Dog Boarding",    emoji: "🛏️" },
  mobile_grooming: { label: "Mobile Grooming", emoji: "✂️" },
  dog_walking:     { label: "Dog Walking",     emoji: "🦮" },
};

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending:           { label: "Awaiting Response",    color: "#d97706", bg: "rgba(251,191,36,.12)" },
  confirmed:         { label: "Awaiting Payment",     color: "#0891b2", bg: "rgba(8,145,178,.10)"  },
  paid:              { label: "Ready to Start",       color: "#059669", bg: "rgba(5,150,105,.10)"  },
  in_progress:       { label: "In Progress",          color: "#6366f1", bg: "rgba(99,102,241,.10)" },
  completed_pending: { label: "Awaiting Confirmation",color: "#8b5cf6", bg: "rgba(139,92,246,.10)" },
  closed:            { label: "Closed",               color: "#10b981", bg: "rgba(16,185,129,.10)" },
  cancelled:         { label: "Cancelled",            color: "#dc2626", bg: "rgba(220,38,38,.08)"  },
};

// Progress track (excludes cancelled)
const TRACK_STEPS: BookingStatus[] = [
  "pending", "confirmed", "paid", "in_progress", "completed_pending", "closed",
];

type TabKey = "all" | "requests" | "upcoming" | "active" | "history";

const TABS: Array<{ key: TabKey; label: string; statuses: BookingStatus[] }> = [
  { key: "all",      label: "All",       statuses: ["pending","confirmed","paid","in_progress","completed_pending","closed","cancelled"] },
  { key: "requests", label: "Requests",  statuses: ["pending"] },
  { key: "upcoming", label: "Upcoming",  statuses: ["confirmed", "paid"] },
  { key: "active",   label: "Active",    statuses: ["in_progress", "completed_pending"] },
  { key: "history",  label: "History",   statuses: ["closed", "cancelled"] },
];

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];

// ── Helpers ────────────────────────────────────────────────────────────────

const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function resolveArr<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

function isThisMonth(iso: string) {
  const d = new Date(iso), now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusTrack({ status }: { status: BookingStatus }) {
  if (status === "cancelled") {
    return <span className="text-[11px] font-bold" style={{ color: "#dc2626" }}>✕ Cancelled</span>;
  }
  const idx = TRACK_STEPS.indexOf(status);
  return (
    <div className="flex items-center">
      {TRACK_STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className="h-3 w-3 rounded-full"
            style={
              i < idx  ? { backgroundColor: "#00b096" }
              : i === idx ? { backgroundColor: "#0a2e30", outline: "2px solid #00b096", outlineOffset: "1px" }
              : { backgroundColor: "#e5e7eb" }
            }
          />
          {i < TRACK_STEPS.length - 1 && (
            <div className="h-px w-4" style={{ backgroundColor: i < idx ? "#00b096" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProviderDashboard() {
  const router = useRouter();

  const { openChat } = useChat();
  const [providerName,   setProviderName]   = useState("");
  const [providerId,     setProviderId]     = useState("");
  const [providerAvatar, setProviderAvatar] = useState<string | null>(null);
  const [providerActive, setProviderActive] = useState(true);
  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<TabKey>("requests");
  const [updating,     setUpdating]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/provider"); return; }

      const { data: p } = await sb
        .from("providers")
        .select("id, active, avatar_url, users!user_id(name)")
        .eq("user_id", user.id)
        .single();

      if (!p) { router.replace("/register/provider"); return; }
      if (cancelled) return;

      const pAny  = p as Record<string, unknown>;
      const pUser = resolveArr(pAny.users as { name: string } | { name: string }[] | null);
      setProviderName(pUser?.name ?? "Provider");
      setProviderId(pAny.id as string);
      setProviderAvatar((pAny.avatar_url as string | null) ?? null);
      setProviderActive(pAny.active as boolean);

      const { data: bks } = await sb
        .from("bookings")
        .select(`
          id, owner_id, service_type, start_date, end_date,
          gross_amount, provider_payout, status, created_at,
          users!owner_id(name, location, avatar_url),
          dogs!dog_id(name, breed, size)
        `)
        .eq("provider_id", pAny.id as string)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setBookings((bks ?? []) as unknown as Booking[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  async function updateStatus(bookingId: string, status: BookingStatus) {
    setUpdating(bookingId);
    const sb = createClient();
    const { error } = await sb
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (!error) setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
    setUpdating(null);
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const map: Record<TabKey, number> = { all: 0, requests: 0, upcoming: 0, active: 0, history: 0 };
    for (const b of bookings) {
      map.all++;
      for (const t of TABS) {
        if (t.statuses.includes(b.status)) { map[t.key]++; break; }
      }
    }
    return map;
  }, [bookings]);

  const stats = useMemo(() => {
    const needsAction = bookings.filter(b =>
      b.status === "pending" || b.status === "paid" || b.status === "in_progress"
    ).length;
    const active = bookings.filter(b =>
      b.status === "confirmed" || b.status === "paid" || b.status === "in_progress" || b.status === "completed_pending"
    ).length;
    const monthEarnings = bookings
      .filter(b => b.status === "closed" && isThisMonth(b.created_at))
      .reduce((s, b) => s + Number(b.provider_payout), 0);
    const totalEarnings = bookings
      .filter(b => b.status === "closed")
      .reduce((s, b) => s + Number(b.provider_payout), 0);
    return { needsAction, active, monthEarnings, totalEarnings };
  }, [bookings]);

  const visible = useMemo(() => {
    const allowed = TABS.find(t => t.key === tab)?.statuses ?? [];
    return bookings.filter(b => allowed.includes(b.status));
  }, [bookings, tab]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <p className="text-2xl font-bold text-white">Dog<span style={{ color: "#00b096" }}>Care</span>GH</p>
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading dashboard…</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <Link href="/" className="text-2xl font-bold tracking-tight text-white">
          Dog<span style={{ color: "#00b096" }}>Care</span>GH
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/provider/services"
            className="hidden rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 sm:block"
          >
            My Services
          </Link>
          <Link href="/dashboard/provider/profile" className="flex items-center transition hover:opacity-80" title="My Profile">
            {providerAvatar ? (
              <img src={providerAvatar} alt={providerName.split(" ")[0]} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/25" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white/25"
                style={{ backgroundColor: providerId ? avatarBg(providerId) : "#00b096" }}
              >
                {ini(providerName)}
              </div>
            )}
          </Link>
          <button
            onClick={async () => { await createClient().auth.signOut(); router.push("/"); }}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Hero / stats ── */}
      <div className="px-6 pb-10 pt-8 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
            Provider Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">
            Welcome back, {providerName.split(" ")[0]}
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { label: "Needs Action",      value: stats.needsAction,                       accent: "#f59e0b" },
              { label: "Active Bookings",   value: stats.active,                            accent: "#00b096" },
              { label: "Earned This Month", value: `GHS ${stats.monthEarnings.toFixed(0)}`, accent: "#a78bfa" },
              { label: "Total Earned",      value: `GHS ${stats.totalEarnings.toFixed(0)}`, accent: "#6366f1" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: "rgba(255,255,255,.06)" }}>
                <p className="text-xs font-medium text-white/50">{s.label}</p>
                <p className="mt-1 text-xl font-extrabold sm:text-2xl" style={{ color: s.accent }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {!providerActive && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3">
              <span>⚠️</span>
              <p className="text-sm text-red-300">
                Your profile is set to <strong>unavailable</strong> — dog owners can&apos;t find or book you on the marketplace.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">

        {/* ── Tab bar ── */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition"
              style={tab === t.key ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                  style={
                    tab === t.key
                      ? { backgroundColor: "rgba(255,255,255,.18)", color: "#fff" }
                      : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                  }
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Booking list ── */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-20 text-center">
            <span className="mb-3 text-5xl">📋</span>
            <p className="text-base font-bold" style={{ color: "#0a2e30" }}>No bookings here yet</p>
            <p className="mt-1 text-sm text-gray-400">
              {tab === "requests" ? "New booking requests from dog owners will appear here." : "Nothing to show for this category."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(b => {
              const owner   = resolveArr(b.users);
              const dog     = resolveArr(b.dogs);
              const ownerFullName = owner?.name ?? "Dog Owner";
              const ownerName = ownerFullName.split(" ")[0];
              const svc     = SERVICES[b.service_type];
              const st      = STATUS_META[b.status];
              const sameDay = b.start_date === b.end_date;
              const isBusy  = updating === b.id;

              return (
                <article
                  key={b.id}
                  className="cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                  onClick={() => router.push(`/booking/${b.id}`)}
                >
                  <div className="p-5">

                    {/* Owner + status */}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/owner-profile/${b.owner_id}`}
                        className="flex items-center gap-3 transition hover:opacity-80"
                        onClick={e => e.stopPropagation()}
                      >
                        {owner?.avatar_url ? (
                          <img src={owner.avatar_url} alt={ownerFullName} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                            style={{ backgroundColor: avatarBg(b.owner_id) }}
                          >
                            {ini(ownerFullName)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>{ownerName}</p>
                          <p className="text-xs text-gray-400">
                            {dog
                              ? `🐕 ${dog.name}${dog.breed || dog.size ? ` · ${[dog.breed, dog.size].filter(Boolean).join(", ")}` : ""}`
                              : "No dog info"}
                            {owner?.location ? ` · 📍 ${owner.location}` : ""}
                          </p>
                        </div>
                      </Link>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ backgroundColor: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>

                    {/* Service + dates */}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{svc?.emoji} {svc?.label}</span>
                      <span>
                        📅{" "}
                        {sameDay ? fmtDate(b.start_date) : `${fmtShort(b.start_date)} → ${fmtDate(b.end_date)}`}
                      </span>
                    </div>

                    {/* Amount row */}
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                      <div>
                        <p className="text-[11px] text-gray-400">Booking total</p>
                        <p className="text-sm font-extrabold" style={{ color: "#0a2e30" }}>
                          GHS {Number(b.gross_amount).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-gray-400">Your payout</p>
                        <p className="text-sm font-extrabold" style={{ color: "#00b096" }}>
                          GHS {Number(b.provider_payout).toFixed(2)}
                        </p>
                      </div>
                      <span className="hidden font-mono text-[10px] text-gray-300 sm:block">
                        #{shortRef(b.id)}
                      </span>
                    </div>

                    {/* Progress track */}
                    <div className="mt-3 flex items-center justify-between">
                      <StatusTrack status={b.status} />
                      <span className="font-mono text-[10px] text-gray-300 sm:hidden">
                        #{shortRef(b.id)}
                      </span>
                    </div>

                    {/* Interactive section — stops card-click propagation */}
                    <div onClick={e => e.stopPropagation()}>

                      {/* Message thread */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openChat(b.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Message Owner
                        </button>
                      </div>

                      {/* Actions */}
                      {b.status === "pending" && (
                        <div className="mt-4 flex gap-2">
                          <button
                            disabled={isBusy}
                            onClick={() => updateStatus(b.id, "confirmed")}
                            className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "#00b096" }}
                          >
                            {isBusy ? "Updating…" : "✓  Accept Booking"}
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => updateStatus(b.id, "cancelled")}
                            className="flex-1 rounded-xl border border-red-200 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {isBusy ? "…" : "Decline"}
                          </button>
                        </div>
                      )}

                      {b.status === "confirmed" && (
                        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-600">
                          ⏳ Waiting for the owner to complete payment before the booking is confirmed.
                        </div>
                      )}

                      {b.status === "paid" && (
                        <div className="mt-4">
                          <button
                            disabled={isBusy}
                            onClick={() => updateStatus(b.id, "in_progress")}
                            className="w-full rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "#6366f1" }}
                          >
                            {isBusy ? "Updating…" : "▶  Start Service"}
                          </button>
                        </div>
                      )}

                      {b.status === "in_progress" && (
                        <div className="mt-4">
                          <button
                            disabled={isBusy}
                            onClick={() => updateStatus(b.id, "completed_pending")}
                            className="w-full rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "#8b5cf6" }}
                          >
                            {isBusy ? "Updating…" : "✓  Mark Service as Complete"}
                          </button>
                        </div>
                      )}

                      {b.status === "completed_pending" && (
                        <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-2.5 text-xs text-purple-600">
                          ⏳ Waiting for the owner to confirm the service is complete and release payment.
                        </div>
                      )}

                      {b.status === "closed" && (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
                          <span className="text-base">✅</span>
                          <p className="text-xs font-medium text-emerald-700">
                            Service confirmed. Payout of{" "}
                            <strong>GHS {Number(b.provider_payout).toFixed(2)}</strong> triggered.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
