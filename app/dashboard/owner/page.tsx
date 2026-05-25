"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

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
  service_type: ServiceId;
  start_date: string;
  end_date: string;
  gross_amount: number;
  status: BookingStatus;
  created_at: string;
  providers: {
    id: string;
    neighbourhood: string | null;
    avatar_url: string | null;
    user_id: string;
    users: { name: string } | { name: string }[] | null;
  } | null;
  dogs: { name: string } | null;
};

type Notification = {
  id: string;
  type: string;
  message: string;
  booking_id: string | null;
  created_at: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const SERVICES: Record<ServiceId, { label: string; emoji: string }> = {
  pet_sitting:     { label: "Pet Sitting",     emoji: "🐾" },
  doggy_daycare:   { label: "Doggy Daycare",   emoji: "🏡" },
  dog_boarding:    { label: "Dog Boarding",    emoji: "🛏️" },
  mobile_grooming: { label: "Mobile Grooming", emoji: "✂️" },
  dog_walking:     { label: "Dog Walking",     emoji: "🦮" },
};

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string; desc: string }> = {
  pending:           { label: "Pending",              color: "#d97706", bg: "rgba(251,191,36,.12)", desc: "Waiting for provider to respond"           },
  confirmed:         { label: "Payment Due",          color: "#0891b2", bg: "rgba(8,145,178,.10)",  desc: "Provider accepted — pay now to confirm"   },
  paid:              { label: "Paid",                 color: "#059669", bg: "rgba(5,150,105,.10)",  desc: "Payment received, service upcoming"       },
  in_progress:       { label: "In Progress",          color: "#6366f1", bg: "rgba(99,102,241,.10)", desc: "Service is underway"                      },
  completed_pending: { label: "Confirm Completion",   color: "#8b5cf6", bg: "rgba(139,92,246,.10)", desc: "Provider marked done — please confirm"    },
  closed:            { label: "Closed",               color: "#10b981", bg: "rgba(16,185,129,.10)", desc: "Service complete, payout released"        },
  cancelled:         { label: "Cancelled",            color: "#dc2626", bg: "rgba(220,38,38,.08)",  desc: "This booking was cancelled"               },
};

const TRACK_STEPS: BookingStatus[] = [
  "pending", "confirmed", "paid", "in_progress", "completed_pending", "closed",
];

type TabKey = "action" | "active" | "history" | "all";

const TABS: Array<{ key: TabKey; label: string; statuses: BookingStatus[] }> = [
  { key: "action",  label: "Action Needed", statuses: ["confirmed", "completed_pending"] },
  { key: "active",  label: "Active",        statuses: ["pending", "paid", "in_progress"] },
  { key: "history", label: "History",       statuses: ["closed", "cancelled"]            },
  { key: "all",     label: "All",           statuses: ["pending","confirmed","paid","in_progress","completed_pending","closed","cancelled"] },
];

const NOTIF_ICONS: Record<string, string> = {
  booking_confirmed:    "✅",
  booking_declined:     "❌",
  booking_cancelled:    "🚫",
  payment_received:     "💳",
  service_started:      "🐾",
  awaiting_confirmation:"⏰",
  payout_triggered:     "💰",
};

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];

// ── Helpers ────────────────────────────────────────────────────────────────

const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function resolveArr<T>(v: T | T[] | null | undefined): T | null {
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

export default function OwnerDashboard() {
  const router = useRouter();

  const [ownerName,    setOwnerName]    = useState("");
  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [notifs,       setNotifs]       = useState<Notification[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<TabKey>("action");
  const [updating,     setUpdating]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/owner"); return; }

      const [{ data: u }, { data: bks }, { data: nf }] = await Promise.all([
        sb.from("users").select("name").eq("id", user.id).single(),
        sb.from("bookings")
          .select(`
            id, service_type, start_date, end_date,
            gross_amount, status, created_at,
            providers!provider_id(id, neighbourhood, avatar_url, user_id, users!user_id(name)),
            dogs!dog_id(name)
          `)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
        sb.from("notifications")
          .select("id, type, message, booking_id, created_at")
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;
      setOwnerName((u as { name: string } | null)?.name ?? "");
      setBookings((bks ?? []) as unknown as Booking[]);
      setNotifs((nf ?? []) as Notification[]);
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

  async function dismissNotif(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id));
    const sb = createClient();
    await sb.from("notifications").update({ read: true }).eq("id", id);
  }

  async function dismissAllNotifs() {
    const ids = notifs.map(n => n.id);
    setNotifs([]);
    const sb = createClient();
    await sb.from("notifications").update({ read: true }).in("id", ids);
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const map: Record<TabKey, number> = { action: 0, active: 0, history: 0, all: 0 };
    for (const b of bookings) {
      map.all++;
      for (const t of TABS) {
        if (t.statuses.includes(b.status)) { map[t.key]++; break; }
      }
    }
    return map;
  }, [bookings]);

  const stats = useMemo(() => ({
    pending:   bookings.filter(b => b.status === "pending").length,
    active:    bookings.filter(b => ["paid","in_progress"].includes(b.status)).length,
    action:    bookings.filter(b => ["confirmed","completed_pending"].includes(b.status)).length,
    completed: bookings.filter(b => b.status === "closed").length,
  }), [bookings]);

  const visible = useMemo(() => {
    const allowed = TABS.find(t => t.key === tab)?.statuses ?? [];
    return bookings.filter(b => allowed.includes(b.status));
  }, [bookings, tab]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <p className="text-2xl font-bold text-white">Dog<span style={{ color: "#00b096" }}>Care</span>GH</p>
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
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
            href="/search"
            className="hidden rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 sm:block"
          >
            Find Providers
          </Link>
          <span className="hidden text-sm text-white/60 sm:block">{ownerName}</span>
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
            My Bookings
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">
            {ownerName ? `Welcome back, ${ownerName.split(" ")[0]}` : "Your Bookings"}
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { label: "Action Needed", value: stats.action,    accent: "#f59e0b" },
              { label: "Pending",       value: stats.pending,   accent: "#0891b2" },
              { label: "Active",        value: stats.active,    accent: "#00b096" },
              { label: "Completed",     value: stats.completed, accent: "#6366f1" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: "rgba(255,255,255,.06)" }}>
                <p className="text-xs font-medium text-white/50">{s.label}</p>
                <p className="mt-1 text-xl font-extrabold sm:text-2xl" style={{ color: s.accent }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">

        {/* ── Notifications ── */}
        {notifs.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Notifications
              </p>
              <button
                onClick={dismissAllNotifs}
                className="text-xs font-semibold transition hover:underline"
                style={{ color: "#00b096" }}
              >
                Dismiss all
              </button>
            </div>
            {notifs.map(n => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <span className="text-xl leading-none">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
                <p className="flex-1 text-sm leading-relaxed text-gray-700">{n.message}</p>
                <button
                  onClick={() => dismissNotif(n.id)}
                  className="shrink-0 text-gray-300 transition hover:text-gray-500"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

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

        {/* ── Empty state ── */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-20 text-center">
            <span className="mb-3 text-5xl">🐾</span>
            <p className="text-base font-bold" style={{ color: "#0a2e30" }}>
              {tab === "action"
                ? "No actions needed right now"
                : tab === "active"
                ? "No active bookings"
                : "No booking history yet"}
            </p>
            <p className="mt-1 mb-5 text-sm text-gray-400">
              {tab === "action" || tab === "active"
                ? "Browse providers to book a service for your dog."
                : "Your completed and cancelled bookings will show here."}
            </p>
            {(tab === "action" || tab === "active") && (
              <Link
                href="/search"
                className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#00b096" }}
              >
                Find Providers
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(b => {
              const provider     = b.providers;
              const providerUser = resolveArr(provider?.users);
              const providerName = providerUser?.name ?? "DogCare Provider";
              const svc          = SERVICES[b.service_type];
              const st           = STATUS_META[b.status];
              const sameDay      = b.start_date === b.end_date;
              const isBusy       = updating === b.id;

              return (
                <article
                  key={b.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-5">

                    {/* Provider + status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {provider?.avatar_url ? (
                          <img
                            src={provider.avatar_url}
                            alt={providerName}
                            className="h-11 w-11 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                            style={{ backgroundColor: avatarBg(provider?.user_id ?? b.id) }}
                          >
                            {ini(providerName)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>
                            {providerName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {[
                              b.dogs?.name ? `🐕 ${b.dogs.name}` : null,
                              provider?.neighbourhood ? `📍 ${provider.neighbourhood}` : null,
                            ].filter(Boolean).join("  ·  ")}
                          </p>
                        </div>
                      </div>
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

                    {/* Status description + amount */}
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                      <p className="text-xs text-gray-500">{st.desc}</p>
                      <p className="shrink-0 text-sm font-extrabold" style={{ color: "#0a2e30" }}>
                        GHS {Number(b.gross_amount).toFixed(2)}
                      </p>
                    </div>

                    {/* Progress track */}
                    <div className="mt-3 flex items-center justify-between">
                      <StatusTrack status={b.status} />
                      <span className="font-mono text-[10px] text-gray-300">#{shortRef(b.id)}</span>
                    </div>

                    {/* ── Actions by status ── */}

                    {/* Confirmed → Pay Now */}
                    {b.status === "confirmed" && (
                      <div className="mt-4 space-y-2">
                        <button
                          disabled={isBusy}
                          onClick={() => updateStatus(b.id, "paid")}
                          className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#00b096" }}
                        >
                          {isBusy ? "Processing…" : "💳  Pay Now — GHS " + Number(b.gross_amount).toFixed(2)}
                        </button>
                        <p className="text-center text-xs text-gray-400">
                          Paystack integration coming soon — payment is simulated for now.
                        </p>
                        <button
                          disabled={isBusy}
                          onClick={() => updateStatus(b.id, "cancelled")}
                          className="w-full rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cancel this booking
                        </button>
                      </div>
                    )}

                    {/* Pending → Cancel */}
                    {b.status === "pending" && (
                      <div className="mt-4">
                        <button
                          disabled={isBusy}
                          onClick={() => updateStatus(b.id, "cancelled")}
                          className="w-full rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isBusy ? "Cancelling…" : "Cancel Request"}
                        </button>
                      </div>
                    )}

                    {/* Paid → View provider link */}
                    {b.status === "paid" && provider && (
                      <div className="mt-4">
                        <Link
                          href={`/provider/${provider.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                        >
                          View Provider Profile
                        </Link>
                      </div>
                    )}

                    {/* Completed pending → Confirm or Dispute */}
                    {b.status === "completed_pending" && (
                      <div className="mt-4 space-y-2">
                        <button
                          disabled={isBusy}
                          onClick={() => updateStatus(b.id, "closed")}
                          className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#00b096" }}
                        >
                          {isBusy ? "Confirming…" : "✓  Confirm Service Complete"}
                        </button>
                        <p className="text-center text-xs text-gray-400">
                          Confirming will release payment to the provider.
                        </p>
                        <button
                          disabled
                          className="w-full cursor-not-allowed rounded-xl border border-amber-200 py-2 text-xs font-medium text-amber-500 opacity-50"
                          title="Coming soon"
                        >
                          Raise a Dispute (coming soon)
                        </button>
                      </div>
                    )}

                    {/* Closed → Leave review CTA */}
                    {b.status === "closed" && provider && (
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                        <span className="text-lg">⭐</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-emerald-700">Booking complete!</p>
                          <p className="text-xs text-emerald-600">How was your experience?</p>
                        </div>
                        <Link
                          href={`/provider/${provider.id}`}
                          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                          style={{ backgroundColor: "#00b096" }}
                        >
                          Review
                        </Link>
                      </div>
                    )}
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
