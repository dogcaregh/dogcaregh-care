"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserSnap   = { name: string; email: string | null; phone: string | null };
type ProviderSnap = { id: string; neighbourhood: string | null; users: UserSnap | UserSnap[] | null };
type DogSnap    = { name: string; breed: string | null; size: string | null; age: number | null; vaccination_status: boolean; leash_trained: boolean | null };

type Booking = {
  id: string;
  service_type: string;
  status: string;
  start_date: string;
  end_date: string;
  selected_dates: string[] | null;
  preferred_time: string | null;
  preferred_end_time: string | null;
  duration_hours: number | null;
  gross_amount: number;
  commission_amount: number;
  provider_payout: number;
  created_at: string;
  users: UserSnap | UserSnap[] | null;
  providers: ProviderSnap | ProviderSnap[] | null;
  dogs: DogSnap | DogSnap[] | null;
};

type Dispute = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type Message = {
  id: string;
  sender_id: string;
  content: string | null;
  photo_url: string | null;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  dog_walking:    "Dog Walking",
  dog_sitting:    "Dog Sitting",
  dog_daycare:    "Dog Daycare",
  dog_boarding:   "Dog Overnight",
  dog_grooming:   "Dog Grooming",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: "Pending",          color: "#d97706", bg: "rgba(251,191,36,.12)" },
  confirmed:         { label: "Confirmed",        color: "#0891b2", bg: "rgba(8,145,178,.10)"  },
  paid:              { label: "Paid",             color: "#059669", bg: "rgba(5,150,105,.10)"  },
  in_progress:       { label: "In Progress",      color: "#2563eb", bg: "rgba(37,99,235,.10)" },
  completed_pending: { label: "Awaiting Confirm", color: "#0284c7", bg: "rgba(2,132,199,.10)" },
  closed:            { label: "Closed",           color: "#10b981", bg: "rgba(16,185,129,.10)" },
  cancelled:         { label: "Cancelled",        color: "#dc2626", bg: "rgba(220,38,38,.08)"  },
};

// Which party has the pending action per status (null = nothing pending).
const PENDING_TARGET: Record<string, "owner" | "provider"> = {
  pending:           "provider",
  confirmed:         "owner",
  paid:              "provider",
  in_progress:       "provider",
  completed_pending: "owner",
};

const DISPUTE_STATUS: Record<string, string> = {
  open:               "Open",
  under_review:       "Under Review",
  resolved_no_action: "Resolved — No Action",
  resolved_refund:    "Resolved — Refund Issued",
  dismissed:          "Dismissed",
};

const REASON_LABELS: Record<string, string> = {
  service_not_delivered: "Service Not Delivered",
  provider_no_show:      "Provider No-Show",
  poor_service_quality:  "Poor Service Quality",
  property_damage:       "Property Damage",
  other:                 "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolve<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtAge(months: number | null): string | null {
  if (months == null) return null;
  if (months < 12) return `${months}mo`;
  const yrs = Math.floor(months / 12);
  const mo  = months % 12;
  return mo === 0 ? `${yrs}yr${yrs > 1 ? "s" : ""}` : `${yrs}yr ${mo}mo`;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shortRef(id: string) { return id.replace(/-/g, "").slice(0, 8).toUpperCase(); }

// ─── Contact card ─────────────────────────────────────────────────────────────

function ContactCard({ label, user }: { label: string; user: UserSnap | null }) {
  if (!user) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>{user.name}</p>
      {user.email && (
        <a href={`mailto:${user.email}`} className="mt-1 block text-xs text-gray-500 transition hover:underline">
          ✉️ {user.email}
        </a>
      )}
      {user.phone && (
        <a href={`tel:${user.phone}`} className="mt-0.5 block text-xs text-gray-500 transition hover:underline">
          📞 {user.phone}
        </a>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBookingDetailPage() {
  const ready     = useAdminGuard();
  const router    = useRouter();
  const { bookingId } = useParams<{ bookingId: string }>();

  const [booking,       setBooking]      = useState<Booking | null>(null);
  const [additionalDogs, setAdditionalDogs] = useState<DogSnap[]>([]);
  const [dispute,       setDispute]      = useState<Dispute | null>(null);
  const [messages,      setMessages]     = useState<Message[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [overrideSt,    setOverrideSt]   = useState("");
  const [overrideBusy,  setOverrideBusy] = useState(false);
  const [remindBusy,    setRemindBusy]   = useState(false);
  const [remindMsg,     setRemindMsg]    = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !bookingId) return;
    fetch(`/api/admin/bookings/${bookingId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push("/admin/bookings"); return; }
        setBooking(data.booking);
        setAdditionalDogs(data.additionalDogs ?? []);
        setOverrideSt(data.booking.status);
        setDispute(data.dispute);
        setMessages(data.messages ?? []);
        setLoading(false);
      });
  }, [ready, bookingId, router]);

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  if (!booking) return null;

  async function applyStatusOverride() {
    if (overrideSt === booking!.status) return;
    if (!confirm(`Change status to "${STATUS_META[overrideSt]?.label ?? overrideSt}"?`)) return;
    setOverrideBusy(true);
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: overrideSt }),
    });
    if (res.ok) setBooking(prev => prev ? { ...prev, status: overrideSt } : prev);
    setOverrideBusy(false);
  }

  async function sendReminder() {
    setRemindBusy(true);
    setRemindMsg(null);
    const res = await fetch(`/api/admin/bookings/${bookingId}/remind`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      setRemindMsg(`Reminder sent to the ${data.target}.`);
    } else {
      setRemindMsg(data?.reason === "no_pending_action" ? "No pending action to remind about." : "Could not send reminder.");
    }
    setRemindBusy(false);
  }

  const ownerSnap    = resolve(booking.users as UserSnap | UserSnap[] | null);
  const providerSnap = resolve(booking.providers as ProviderSnap | ProviderSnap[] | null);
  const providerUser = resolve(providerSnap?.users as UserSnap | UserSnap[] | null);
  const dogSnap      = resolve(booking.dogs as DogSnap | DogSnap[] | null);
  const allDogs      = [dogSnap, ...additionalDogs].filter((d): d is DogSnap => d != null);
  const pendingTarget = PENDING_TARGET[booking.status] ?? null;
  const sm           = STATUS_META[booking.status] ?? STATUS_META.pending;
  const sameDay      = booking.start_date === booking.end_date;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      {/* Header */}
      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <Link href="/admin/bookings" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 transition hover:text-white/80">
          ← All Bookings
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Booking</p>
            <h1 className="mt-1 font-mono text-2xl font-extrabold text-white">#{shortRef(booking.id)}</h1>
            <p className="mt-0.5 text-sm text-white/50">{fmtDateTime(booking.created_at)}</p>
          </div>
          <span className="rounded-full px-3 py-1.5 text-sm font-bold" style={{ backgroundColor: sm.bg, color: sm.color }}>
            {sm.label}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 md:px-8">

        {/* Dispute banner */}
        {dispute && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <span className="mt-0.5 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">Dispute: {REASON_LABELS[dispute.reason] ?? dispute.reason}</p>
              <p className="mt-0.5 text-xs text-amber-600">{DISPUTE_STATUS[dispute.status] ?? dispute.status} · {fmtDateTime(dispute.created_at)}</p>
              {dispute.description && <p className="mt-1.5 text-xs text-amber-700 leading-relaxed">{dispute.description}</p>}
            </div>
            <Link href="/admin/disputes" className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90" style={{ backgroundColor: "#d97706" }}>
              View in Disputes
            </Link>
          </div>
        )}

        {/* Status override */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin — Override Status</p>
          <div className="flex items-center gap-3">
            <select
              value={overrideSt}
              onChange={e => setOverrideSt(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium focus:outline-none"
              style={{ color: "#0a2e30" }}
            >
              {Object.entries(STATUS_META).map(([s, m]) => (
                <option key={s} value={s}>{m.label}</option>
              ))}
            </select>
            <button
              onClick={applyStatusOverride}
              disabled={overrideBusy || overrideSt === booking.status}
              className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "#0a2e30" }}
            >
              {overrideBusy ? "Saving…" : "Apply"}
            </button>
          </div>
        </div>

        {/* Reminder */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin — Reminder</p>
          {pendingTarget ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex-1 text-sm text-gray-600">
                Nudge the <span className="font-bold capitalize" style={{ color: "#0a2e30" }}>{pendingTarget}</span> about the pending action for this booking.
              </p>
              <button
                onClick={sendReminder}
                disabled={remindBusy}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#00b096" }}
              >
                {remindBusy ? "Sending…" : `Remind ${pendingTarget}`}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No pending action — nothing to remind about at this status.</p>
          )}
          {remindMsg && <p className="mt-2 text-xs font-semibold" style={{ color: "#00b096" }}>{remindMsg}</p>}
        </div>

        {/* Service + dates */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Service</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-[10px] text-gray-400">Type</p>
              <p className="font-semibold" style={{ color: "#0a2e30" }}>{SERVICE_LABELS[booking.service_type] ?? booking.service_type}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Date{sameDay ? "" : "s"}</p>
              <p className="font-semibold" style={{ color: "#0a2e30" }}>
                {sameDay ? fmtDate(booking.start_date) : `${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)}`}
              </p>
            </div>
            {booking.preferred_time && (
              <div>
                <p className="text-[10px] text-gray-400">Time</p>
                <p className="font-semibold" style={{ color: "#0a2e30" }}>
                  {booking.preferred_time}{booking.preferred_end_time ? ` – ${booking.preferred_end_time}` : ""}
                </p>
              </div>
            )}
            {providerSnap?.neighbourhood && (
              <div>
                <p className="text-[10px] text-gray-400">Location</p>
                <p className="font-semibold" style={{ color: "#0a2e30" }}>{providerSnap.neighbourhood}</p>
              </div>
            )}
          </div>

          {/* Selected dates list (multi-date bookings) */}
          {booking.selected_dates && booking.selected_dates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {booking.selected_dates.map(d => (
                <span key={d} className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{fmtDate(d)}</span>
              ))}
            </div>
          )}
        </div>

        {/* Food notice */}
        {["dog_boarding", "dog_sitting", "dog_daycare"].includes(booking.service_type) && (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            🍖 Please note: owners are required to provide their dog&apos;s food for the duration of the service.
          </p>
        )}

        {/* Contacts */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactCard label="Owner" user={ownerSnap} />
          <ContactCard label="Provider" user={providerUser} />
        </div>

        {/* Dogs (primary + any additional) */}
        {allDogs.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {allDogs.length > 1 ? `Dogs (${allDogs.length})` : "Dog"}
            </p>
            <div className="space-y-4">
              {allDogs.map((dog, i) => (
                <div key={i} className={i > 0 ? "border-t border-gray-100 pt-4" : ""}>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <p className="text-[10px] text-gray-400">Name</p>
                      <p className="font-semibold" style={{ color: "#0a2e30" }}>{dog.name}</p>
                    </div>
                    {dog.breed && <div><p className="text-[10px] text-gray-400">Breed</p><p className="font-semibold" style={{ color: "#0a2e30" }}>{dog.breed}</p></div>}
                    {dog.size  && <div><p className="text-[10px] text-gray-400">Size</p><p className="font-semibold capitalize" style={{ color: "#0a2e30" }}>{dog.size}</p></div>}
                    {dog.age != null && <div><p className="text-[10px] text-gray-400">Age</p><p className="font-semibold" style={{ color: "#0a2e30" }}>{fmtAge(dog.age)}</p></div>}
                    <div>
                      <p className="text-[10px] text-gray-400">Vaccinated</p>
                      <p className="font-semibold" style={{ color: dog.vaccination_status ? "#059669" : "#dc2626" }}>
                        {dog.vaccination_status ? "Yes" : "No"}
                      </p>
                    </div>
                    {dog.leash_trained != null && (
                      <div>
                        <p className="text-[10px] text-gray-400">Leash Trained</p>
                        <p className="font-semibold" style={{ color: dog.leash_trained ? "#059669" : "#dc2626" }}>
                          {dog.leash_trained ? "Yes" : "No"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financials */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Financials</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-gray-400">Gross</p>
              <p className="text-base font-extrabold" style={{ color: "#0a2e30" }}>GHS {Number(booking.gross_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Commission (25%)</p>
              <p className="text-base font-extrabold" style={{ color: "#2563eb" }}>GHS {Number(booking.commission_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Provider Payout</p>
              <p className="text-base font-extrabold" style={{ color: "#00b096" }}>GHS {Number(booking.provider_payout).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {messages.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Messages ({messages.length})
            </p>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="mb-1 text-[10px] text-gray-400">{fmtDateTime(m.created_at)}</p>
                  {m.content && <p className="text-sm text-gray-700">{m.content}</p>}
                  {m.photo_url && (
                    <a href={m.photo_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs font-semibold text-blue-500 hover:underline">
                      📷 View photo
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
