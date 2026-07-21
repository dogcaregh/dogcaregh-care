"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StarRating } from "@/components/star-rating";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useChat } from "@/lib/chat-context";
import { NotificationsBell } from "@/components/notifications-bell";
import { useNotifications } from "@/lib/notifications-context";
import { SERVICE_META } from "@/lib/service-meta";
import { PetcitiAd } from "@/components/petciti-ad";

// ── Types ──────────────────────────────────────────────────────────────────

type CashoutRequest = {
  id: string;
  amount: number;
  momo_network: string;
  momo_number: string;
  status: "pending" | "paid" | "rejected";
  note: string | null;
  created_at: string;
  paid_at: string | null;
  source: "earnings" | "referral";
};

const SLUG_EMOJI: Record<string, string> = {
  dog_walking: "🦮", dog_sitting: "🐾", dog_daycare: "🏡",
  dog_boarding: "🛏️", dog_grooming: "✂️",
};

type AvailSlot = { available: boolean; start?: string; end?: string };

type ProviderService = {
  id: string;
  rate_small: number | null;
  rate_medium: number | null;
  rate_large: number | null;
  availability: Record<string, AvailSlot> | null;
  description: string | null;
  service_types: { slug: string; name: string; emoji: string } | null;
};

type BookingStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "in_progress"
  | "completed_pending"
  | "closed"
  | "cancelled";

type ServiceId =
  | "dog_sitting"
  | "dog_daycare"
  | "dog_boarding"
  | "dog_grooming"
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
  dog_sitting:  { label: "Dog Sitting",  emoji: "🐾" },
  dog_daycare:  { label: "Dog Daycare",  emoji: "🏡" },
  dog_boarding: { label: "Dog Overnight", emoji: "🛏️" },
  dog_grooming: { label: "Dog Grooming", emoji: "✂️" },
  dog_walking:  { label: "Dog Walking",  emoji: "🦮" },
};

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending:           { label: "Awaiting Response",    color: "#d97706", bg: "rgba(251,191,36,.12)" },
  confirmed:         { label: "Awaiting Payment",     color: "#0891b2", bg: "rgba(8,145,178,.10)"  },
  paid:              { label: "Ready to Start",       color: "#059669", bg: "rgba(5,150,105,.10)"  },
  in_progress:       { label: "In Progress",          color: "#2563eb", bg: "rgba(37,99,235,.10)" },
  completed_pending: { label: "Awaiting Confirmation",color: "#0284c7", bg: "rgba(2,132,199,.10)" },
  closed:            { label: "Closed",               color: "#10b981", bg: "rgba(16,185,129,.10)" },
  cancelled:         { label: "Cancelled",            color: "#dc2626", bg: "rgba(220,38,38,.08)"  },
};

// Progress track (excludes cancelled)
const TRACK_STEPS: BookingStatus[] = [
  "pending", "confirmed", "paid", "in_progress", "completed_pending", "closed",
];

type TabKey = "all" | "requests" | "upcoming" | "active" | "history" | "earnings" | "reviews";

type Review = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  users: { name: string } | { name: string }[] | null;
};

const TABS: Array<{ key: TabKey; label: string; statuses: BookingStatus[] }> = [
  { key: "all",      label: "All",       statuses: ["pending","confirmed","paid","in_progress","completed_pending","closed","cancelled"] },
  { key: "requests", label: "Requests",  statuses: ["pending"] },
  { key: "upcoming", label: "Upcoming",  statuses: ["confirmed", "paid"] },
  { key: "active",   label: "Active",    statuses: ["in_progress", "completed_pending"] },
  { key: "history",  label: "History",   statuses: ["closed", "cancelled"] },
];

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#2563eb","#0284c7","#ec4899"];

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

const MOMO_LABELS: Record<string, string> = {
  mtn:        "MTN Mobile Money",
  vodafone:   "Telecel Cash",
  airtel_tigo:"AirtelTigo Money",
};

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

function EarningsView({
  bookings,
  cashouts,
  providerId,
  momoNetwork,
  momoNumber,
}: {
  bookings: Booking[];
  cashouts: CashoutRequest[];
  providerId: string;
  momoNetwork: string | null;
  momoNumber: string | null;
}) {
  const [requesting,   setRequesting]   = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [localCashouts, setLocalCashouts] = useState(cashouts);

  const closed  = bookings.filter(b => b.status === "closed");
  const pending = bookings.filter(b =>
    ["confirmed","paid","in_progress","completed_pending"].includes(b.status)
  );

  const totalEarned    = closed.reduce((s, b) => s + Number(b.provider_payout), 0);
  const thisMonth      = closed.filter(b => isThisMonth(b.created_at)).reduce((s, b) => s + Number(b.provider_payout), 0);
  const pendingAmount  = pending.reduce((s, b) => s + Number(b.provider_payout), 0);
  const totalCashedOut = localCashouts.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const pendingCashout = localCashouts.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const available      = Math.max(0, totalEarned - totalCashedOut - pendingCashout);

  const hasMomo = !!(momoNetwork && momoNumber);

  async function requestWithdrawal() {
    if (!hasMomo || available <= 0) return;
    setRequesting(true);
    setRequestError(null);
    const sb = createClient();
    const { data, error } = await sb
      .from("cashout_requests")
      .insert({
        provider_id:  providerId,
        amount:       available,
        momo_network: momoNetwork!,
        momo_number:  momoNumber!,
        source:       "earnings",
      })
      .select("id, amount, momo_network, momo_number, status, note, created_at, paid_at, source")
      .single();
    if (error) {
      setRequestError(error.message);
    } else if (data) {
      setLocalCashouts(prev => [data as CashoutRequest, ...prev]);
    }
    setRequesting(false);
  }

  const CASHOUT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: "Pending",   color: "#d97706", bg: "rgba(251,191,36,.12)" },
    paid:     { label: "Paid",      color: "#10b981", bg: "rgba(16,185,129,.10)" },
    rejected: { label: "Rejected",  color: "#dc2626", bg: "rgba(220,38,38,.08)"  },
  };

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Earned",    value: `GHS ${totalEarned.toFixed(2)}`,    color: "#10b981" },
          { label: "Available",       value: `GHS ${available.toFixed(2)}`,       color: "#00b096" },
          { label: "In Bookings",     value: `GHS ${pendingAmount.toFixed(2)}`,   color: "#f59e0b" },
          { label: "This Month",      value: `GHS ${thisMonth.toFixed(2)}`,        color: "#2563eb" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-center">
            <p className="text-[11px] font-medium text-gray-400">{s.label}</p>
            <p className="mt-1 text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Withdraw */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>Request Withdrawal</p>
            {hasMomo ? (
              <p className="mt-0.5 text-xs text-gray-500">
                Will be sent to {MOMO_LABELS[momoNetwork!] ?? momoNetwork} · <span className="font-mono">{momoNumber}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-400">Add your mobile money details first.</p>
            )}
            {requestError && (
              <p className="mt-2 text-xs text-red-500">{requestError}</p>
            )}
            {pendingCashout > 0 && (
              <p className="mt-2 text-xs text-amber-600">
                You have a pending withdrawal of GHS {pendingCashout.toFixed(2)} — wait for it to be processed before requesting another.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {hasMomo ? (
              <button
                onClick={requestWithdrawal}
                disabled={requesting || available <= 0 || pendingCashout > 0}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#00b096" }}
              >
                {requesting ? "Requesting…" : available > 0 ? `Withdraw GHS ${available.toFixed(2)}` : "Nothing to withdraw"}
              </button>
            ) : (
              <Link
                href="/dashboard/provider/edit#payout"
                className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#00b096" }}
              >
                Add MoMo Details
              </Link>
            )}
            <Link
              href="/dashboard/provider/edit#payout"
              className="text-[11px] text-gray-400 hover:underline"
            >
              {hasMomo ? "Change payout method" : ""}
            </Link>
          </div>
        </div>
      </div>

      {/* Withdrawal history */}
      {localCashouts.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>Withdrawal History</p>
          </div>
          <div className="divide-y divide-gray-50">
            {localCashouts.map(c => {
              const st = CASHOUT_STATUS[c.status] ?? CASHOUT_STATUS.pending;
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>
                      GHS {Number(c.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {MOMO_LABELS[c.momo_network] ?? c.momo_network} · {c.momo_number} · {fmtDate(c.created_at)}
                    </p>
                    {c.note && <p className="mt-0.5 text-xs text-gray-500 italic">{c.note}</p>}
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Earnings history */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>
            Completed Bookings
            {closed.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({closed.length})</span>}
          </p>
        </div>
        {closed.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <span className="mb-3 text-4xl">💰</span>
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>No earnings yet</p>
            <p className="mt-1 text-xs text-gray-400">Completed bookings will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {closed.map(b => {
              const owner = resolveArr(b.users);
              const svc   = SERVICES[b.service_type];
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-5 py-3.5 transition hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.location.href = `/booking/${b.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                      style={{ backgroundColor: avatarBg(b.owner_id) }}
                    >
                      {ini(owner?.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>
                        {owner?.name?.split(" ")[0] ?? "Owner"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {svc?.emoji} {svc?.label} · {fmtDate(b.end_date)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-extrabold" style={{ color: "#10b981" }}>
                    GHS {Number(b.provider_payout).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending earnings */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-800">In-Progress Bookings</p>
          <p className="mt-0.5 text-xs text-amber-600 mb-4">
            Earnings from these bookings will be available once owners confirm completion.
          </p>
          <div className="space-y-2">
            {pending.map(b => {
              const owner = resolveArr(b.users);
              const svc   = SERVICES[b.service_type];
              const st    = STATUS_META[b.status];
              return (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#0a2e30" }}>
                      {owner?.name?.split(" ")[0] ?? "Owner"} · {svc?.label}
                    </p>
                    <span className="text-[10px] font-bold" style={{ color: st.color }}>{st.label}</span>
                  </div>
                  <p className="text-sm font-bold text-amber-700">
                    GHS {Number(b.provider_payout).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewsView({ reviews, ratingAvg, reviewCount }: { reviews: Review[]; ratingAvg: number; reviewCount: number }) {
  const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#2563eb","#0284c7","#ec4899"];
  const bg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];
  const ini = (name?: string | null) => name ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";

  const dist = [5,4,3,2,1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === n).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="space-y-5">
      {/* Rating summary */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="mb-2 text-4xl">⭐</span>
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>No reviews yet</p>
            <p className="mt-1 text-xs text-gray-400">Complete bookings and ask owners to leave a review.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="text-center">
              <p className="text-5xl font-extrabold" style={{ color: "#0a2e30" }}>{ratingAvg.toFixed(1)}</p>
              <StarRating value={ratingAvg} size="md" />
              <p className="mt-1 text-xs text-gray-400">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {dist.map(d => (
                <div key={d.star} className="flex items-center gap-2">
                  <span className="w-4 text-right text-xs text-gray-500">{d.star}</span>
                  <span className="text-xs" style={{ color: "#f59e0b" }}>★</span>
                  <div className="flex-1 rounded-full bg-gray-100 h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: "#f59e0b" }} />
                  </div>
                  <span className="w-6 text-right text-xs text-gray-400">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review list */}
      {reviews.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>All Reviews</p>
          </div>
          <div className="divide-y divide-gray-50">
            {reviews.map(r => {
              const reviewer = Array.isArray(r.users) ? r.users[0] : r.users;
              const name = (reviewer as { name: string } | null)?.name ?? "Owner";
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: bg(r.id) }}
                    >
                      {ini(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <StarRating value={r.rating} />
                      {r.body && <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{r.body}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ReferralCard({
  code, balance, referredCount, providerId, momoNetwork, momoNumber, referralCashouts,
}: {
  code: string;
  balance: number;
  referredCount: number;
  providerId: string;
  momoNetwork: string | null;
  momoNumber: string | null;
  referralCashouts: CashoutRequest[];
}) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [localCashouts, setLocalCashouts] = useState(referralCashouts);

  const link = typeof window !== "undefined"
    ? `${window.location.origin}/register/owner?ref=${code}`
    : `/register/owner?ref=${code}`;

  // balance is the lifetime referral total; available derives from it,
  // mirroring how the Earnings tab treats booking payouts.
  const cashedOut      = localCashouts.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const pendingCashout = localCashouts.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const available      = Math.max(0, balance - cashedOut - pendingCashout);
  const hasMomo        = !!(momoNetwork && momoNumber);

  async function copy(text: string, which: "link" | "code") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* clipboard unavailable */ }
  }

  async function requestWithdrawal() {
    if (!hasMomo || available <= 0) return;
    setRequesting(true);
    setRequestError(null);
    const sb = createClient();
    const { data, error } = await sb
      .from("cashout_requests")
      .insert({
        provider_id:  providerId,
        amount:       available,
        momo_network: momoNetwork!,
        momo_number:  momoNumber!,
        source:       "referral",
      })
      .select("id, amount, momo_network, momo_number, status, note, created_at, paid_at, source")
      .single();
    if (error) {
      setRequestError(error.message);
    } else if (data) {
      setLocalCashouts(prev => [data as CashoutRequest, ...prev]);
    }
    setRequesting(false);
  }

  if (!code) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Share */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>Refer &amp; Earn</p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Share your code with dog owners. Earn <strong>5%</strong> of every booking they make, for 12 months.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => copy(code, "code")}
              className="rounded-xl border border-gray-200 px-3 py-2 font-mono text-sm font-bold tracking-wider transition hover:bg-gray-50"
              style={{ color: "#00b096" }}
              title="Copy code"
            >
              {code}
            </button>
            <button
              onClick={() => copy(link, "link")}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              {copied === "link" ? "Link copied!" : copied === "code" ? "Code copied!" : "Copy share link"}
            </button>
          </div>
        </div>

        {/* Balance + withdraw */}
        <div className="sm:w-64 sm:shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2.5 text-center">
              <p className="text-[10px] font-medium text-gray-400">Available</p>
              <p className="mt-0.5 text-sm font-extrabold" style={{ color: "#00b096" }}>GHS {available.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2.5 text-center">
              <p className="text-[10px] font-medium text-gray-400">Earned</p>
              <p className="mt-0.5 text-sm font-extrabold" style={{ color: "#10b981" }}>GHS {balance.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2.5 text-center">
              <p className="text-[10px] font-medium text-gray-400">Referred</p>
              <p className="mt-0.5 text-sm font-extrabold" style={{ color: "#0a2e30" }}>{referredCount}</p>
            </div>
          </div>

          {hasMomo ? (
            <button
              onClick={requestWithdrawal}
              disabled={requesting || available <= 0 || pendingCashout > 0}
              className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "#00b096" }}
            >
              {requesting ? "Requesting…" : available > 0 ? `Withdraw GHS ${available.toFixed(2)}` : "Nothing to withdraw"}
            </button>
          ) : (
            <Link
              href="/dashboard/provider/edit#payout"
              className="mt-2 block w-full rounded-xl px-4 py-2 text-center text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              Add MoMo Details
            </Link>
          )}

          {requestError && <p className="mt-1.5 text-[11px] text-red-500">{requestError}</p>}
          {pendingCashout > 0 && (
            <p className="mt-1.5 text-[11px] text-amber-600">
              GHS {pendingCashout.toFixed(2)} withdrawal pending.
            </p>
          )}
          {hasMomo && (
            <p className="mt-1.5 text-[10px] text-gray-400">
              Paid to {MOMO_LABELS[momoNetwork!] ?? momoNetwork} · <span className="font-mono">{momoNumber}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProviderDashboard() {
  const router = useRouter();
  const { openChat } = useChat();
  const { notifications: bellNotifs } = useNotifications();

  const unreadMsgBookings = useMemo(() =>
    new Set(bellNotifs.filter(n => n.type === "new_message" && !n.read && n.booking_id).map(n => n.booking_id!)),
  [bellNotifs]);
  const [providerName,   setProviderName]   = useState("");
  const [providerId,     setProviderId]     = useState("");
  const [providerAvatar, setProviderAvatar] = useState<string | null>(null);
  const [providerActive, setProviderActive] = useState(true);
  const [momoNetwork,        setMomoNetwork]        = useState<string | null>(null);
  const [momoNumber,         setMomoNumber]         = useState<string | null>(null);
  const [referralCode,       setReferralCode]       = useState("");
  const [referralBalance,    setReferralBalance]    = useState(0);
  const [referredCount,      setReferredCount]      = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<string>("unsubmitted");
  const [providerLevel,      setProviderLevel]      = useState<number>(1);
  const [cashouts,       setCashouts]       = useState<CashoutRequest[]>([]);
  const [reviews,        setReviews]        = useState<Review[]>([]);
  const [services,     setServices]     = useState<ProviderService[]>([]);
  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<TabKey>("requests");
  const [updating,     setUpdating]     = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  function goToTab(t: TabKey) {
    setTab(t);
    setTimeout(() => {
      if (!tabsRef.current) return;
      const top = tabsRef.current.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 50);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/provider"); return; }

      const provRes = await fetch("/api/dashboard/provider");
      if (!provRes.ok) { router.replace("/register/provider"); return; }
      const { provider: p } = await provRes.json();
      if (!p) { router.replace("/register/provider"); return; }
      if (cancelled) return;

      const pAny  = p as Record<string, unknown>;
      const pUser = resolveArr(pAny.users as { name: string } | { name: string }[] | null);
      setProviderName(pUser?.name ?? "Provider");
      setProviderId(pAny.id as string);
      setProviderAvatar((pAny.avatar_url as string | null) ?? null);
      setProviderActive(pAny.active as boolean);
      setMomoNetwork((pAny.momo_network as string | null) ?? null);
      setMomoNumber((pAny.momo_number as string | null) ?? null);
      setVerificationStatus((pAny.verification_status as string | null) ?? "unsubmitted");
      setProviderLevel((pAny.provider_level as number | null) ?? 1);
      setReferralCode((pAny.referral_code as string | null) ?? "");
      setReferralBalance(Number(pAny.referral_balance ?? 0));

      const [{ data: bks }, { data: svcs }, { data: stData }, { data: cos }, { data: rvws }, { data: refs }] = await Promise.all([
        sb
          .from("bookings")
          .select(`
            id, owner_id, service_type, start_date, end_date,
            gross_amount, provider_payout, status, created_at,
            users!owner_id(name, location, avatar_url),
            dogs!dog_id(name, breed, size)
          `)
          .eq("provider_id", pAny.id as string)
          .order("created_at", { ascending: false }),
        sb
          .from("provider_services")
          .select("id, service_type_id, rate_small, rate_medium, rate_large, availability, description, is_active")
          .eq("provider_id", pAny.id as string),
        sb.from("service_types").select("id, slug, name"),
        sb.from("cashout_requests")
          .select("id, amount, momo_network, momo_number, status, note, created_at, paid_at, source")
          .eq("provider_id", pAny.id as string)
          .order("created_at", { ascending: false }),
        sb.from("reviews")
          .select("id, rating, body, created_at, users!from_user_id(name)")
          .eq("to_user_id", user.id)
          .eq("from_role", "owner")
          .order("created_at", { ascending: false }),
        sb.from("referrals")
          .select("id")
          .eq("referrer_provider_id", pAny.id as string),
      ]);

      if (cancelled) return;
      setReferredCount((refs ?? []).length);
      setBookings((bks ?? []) as unknown as Booking[]);
      setCashouts((cos ?? []) as unknown as CashoutRequest[]);
      setReviews((rvws ?? []) as unknown as Review[]);
      const activeRows = (svcs ?? []).filter(s => (s as Record<string, unknown>).is_active);
      const svcsMapped = activeRows.map(s => {
        const sid = (s as Record<string, unknown>).service_type_id as string;
        const row = (stData ?? []).find(t => t.id === sid);
        const slug = row?.slug ?? "";
        return {
          ...s,
          service_types: row ? { slug, name: row.name, emoji: SLUG_EMOJI[slug] ?? "🐾" } : null,
        };
      });
      setServices(svcsMapped as unknown as ProviderService[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  async function updateStatus(bookingId: string, status: BookingStatus) {
    setUpdating(bookingId);
    const sb = createClient();
    const prevStatus = bookings.find(b => b.id === bookingId)?.status;
    const { error } = await sb
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      if (prevStatus === "pending") {
        const emailType =
          status === "confirmed" ? "booking_confirmed" :
          status === "cancelled" ? "booking_declined"  :
          null;
        if (emailType) {
          fetch(`/api/bookings/${bookingId}/email-trigger`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: emailType }),
          }).catch(() => {});
        }
      }
    }
    setUpdating(null);
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const map: Record<TabKey, number> = { all: 0, requests: 0, upcoming: 0, active: 0, history: 0, earnings: 0, reviews: 0 };
    for (const b of bookings) {
      map.all++;
      for (const t of TABS) {
        if (t.key === "all") continue;
        if (t.statuses.includes(b.status)) { map[t.key]++; break; }
      }
    }
    return map;
  }, [bookings]);

  const stats = useMemo(() => {
    const needsAction   = bookings.filter(b => b.status === "confirmed" || b.status === "paid").length;
    const active        = bookings.filter(b => b.status === "in_progress" || b.status === "completed_pending").length;
    const newRequests   = bookings.filter(b => b.status === "pending").length;
    const monthEarnings = bookings
      .filter(b => b.status === "closed" && isThisMonth(b.created_at))
      .reduce((s, b) => s + Number(b.provider_payout), 0);
    return { needsAction, active, newRequests, monthEarnings };
  }, [bookings]);

  const visible = useMemo(() => {
    const allowed = TABS.find(t => t.key === tab)?.statuses ?? [];
    return bookings.filter(b => allowed.includes(b.status));
  }, [bookings, tab]);

  // Keep the two payout pools separate: booking earnings vs referral rewards.
  const earningsCashouts = useMemo(() => cashouts.filter(c => c.source !== "referral"), [cashouts]);
  const referralCashouts = useMemo(() => cashouts.filter(c => c.source === "referral"), [cashouts]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
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
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/provider/services"
            className="hidden rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 sm:block"
          >
            My Services
          </Link>
          <NotificationsBell />
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
              { label: "New Requests",      value: stats.newRequests,                       accent: "#3b82f6", dest: "requests" as TabKey },
              { label: "Needs Action",      value: stats.needsAction,                       accent: "#ef4444", dest: "upcoming" as TabKey },
              { label: "Active Bookings",   value: stats.active,                            accent: "#00b096", dest: "active"   as TabKey },
              { label: "Earned This Month", value: `GHS ${stats.monthEarnings.toFixed(0)}`, accent: "#f59e0b", dest: "earnings" as TabKey },
            ].map(s => (
              <button
                key={s.label}
                onClick={() => goToTab(s.dest)}
                className="rounded-2xl p-4 sm:p-5 text-left transition hover:opacity-80 active:scale-95"
                style={{ backgroundColor: "rgba(255,255,255,.06)" }}
              >
                <p className="text-xs font-medium text-white/50">{s.label}</p>
                <p className="mt-1 text-xl font-extrabold sm:text-2xl" style={{ color: s.accent }}>
                  {s.value}
                </p>
              </button>
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

          {/* Verification status banner */}
          {verificationStatus === "unsubmitted" && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <span>📋</span>
                <p className="text-sm text-amber-200">Complete your verification to unlock full access and appear as a trusted care provider.</p>
              </div>
              <Link href="/dashboard/provider/verify" className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90" style={{ backgroundColor: "#d97706" }}>
                Apply Now
              </Link>
            </div>
          )}
          {verificationStatus === "pending" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
              <span>🕐</span>
              <p className="text-sm text-blue-200">Your verification is <strong>under review</strong>. We&apos;ll notify you once it&apos;s processed.</p>
            </div>
          )}
          {verificationStatus === "approved" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
              <span>✅</span>
              <p className="text-sm text-emerald-200"><strong>Verified</strong> — Level {providerLevel} care provider</p>
            </div>
          )}
          {verificationStatus === "rejected" && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <span>❌</span>
                <p className="text-sm text-red-200">Your verification was not approved. Please review the feedback and reapply.</p>
              </div>
              <Link href="/dashboard/provider/verify" className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90" style={{ backgroundColor: "#dc2626" }}>
                Reapply
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">

        {/* ── Services summary ── */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>My Active Services</p>
            <Link
              href="/dashboard/provider/services"
              className="rounded-full px-3 py-1 text-[11px] font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              Edit Services
            </Link>
          </div>
          {services.length === 0 ? (
            <div className="flex items-center gap-3 border-t border-gray-50 px-5 py-4">
              <span className="text-xl">🐾</span>
              <div>
                <p className="text-sm font-medium text-gray-500">No services set up yet</p>
                <p className="text-xs text-gray-400">Add your services so dog owners can find and book you.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 border-t border-gray-50 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map(svc => {
                const st = svc.service_types;
                const label = st?.name ?? "Service";
                const emoji = st?.emoji ?? "🐾";
                const DAYS_SHORT: Record<string, string> = {
                  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
                  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
                };
                const activeDays = Object.entries(svc.availability ?? {})
                  .filter(([, slot]) => slot.available)
                  .map(([d]) => DAYS_SHORT[d] ?? d);
                return (
                  <div
                    key={svc.id}
                    className="rounded-xl border border-gray-100 p-4"
                    style={{ borderLeftWidth: 3, borderLeftColor: "#00b096" }}
                  >
                    <div className="mb-3 flex items-start gap-2">
                      <span className="text-xl">{emoji}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>{label}</p>
                        {st?.slug && SERVICE_META[st.slug as keyof typeof SERVICE_META]?.description && (
                          <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{SERVICE_META[st.slug as keyof typeof SERVICE_META].description}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {svc.rate_small  != null && <div className="flex justify-between text-xs"><span className="text-gray-400">Small dog</span><span className="font-semibold" style={{ color: "#00b096" }}>GHS {Number(svc.rate_small).toFixed(2)}</span></div>}
                      {svc.rate_medium != null && <div className="flex justify-between text-xs"><span className="text-gray-400">Medium dog</span><span className="font-semibold" style={{ color: "#00b096" }}>GHS {Number(svc.rate_medium).toFixed(2)}</span></div>}
                      {svc.rate_large  != null && <div className="flex justify-between text-xs"><span className="text-gray-400">Large dog</span><span className="font-semibold" style={{ color: "#00b096" }}>GHS {Number(svc.rate_large).toFixed(2)}</span></div>}
                      {svc.rate_small == null && svc.rate_medium == null && svc.rate_large == null && (
                        <p className="text-xs text-gray-400">Rate on request</p>
                      )}
                    </div>
                    {activeDays.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1 border-t border-gray-50 pt-3">
                        {activeDays.map(d => (
                          <span key={d} className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(0,176,150,.1)", color: "#00b096" }}>{d}</span>
                        ))}
                      </div>
                    )}
                    {svc.description && (
                      <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{svc.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Refer & Earn ── */}
        <ReferralCard
          code={referralCode}
          balance={referralBalance}
          referredCount={referredCount}
          providerId={providerId}
          momoNetwork={momoNetwork}
          momoNumber={momoNumber}
          referralCashouts={referralCashouts}
        />

        {/* ── Tab bar ── */}
        <div ref={tabsRef} className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
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
          <button
            onClick={() => goToTab("earnings")}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition"
            style={tab === "earnings" ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
          >
            Earnings
          </button>
          <button
            onClick={() => goToTab("reviews")}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition"
            style={tab === "reviews" ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
          >
            Reviews
            {reviews.length > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                style={tab === "reviews"
                  ? { backgroundColor: "rgba(255,255,255,.18)", color: "#fff" }
                  : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                }
              >
                {reviews.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Earnings view ── */}
        {tab === "earnings" && (
          <EarningsView bookings={bookings} cashouts={earningsCashouts} providerId={providerId} momoNetwork={momoNetwork} momoNumber={momoNumber} />
        )}

        {/* ── Reviews view ── */}
        {tab === "reviews" && (
          <ReviewsView
            reviews={reviews}
            ratingAvg={reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0}
            reviewCount={reviews.length}
          />
        )}

        {/* ── Booking list ── */}
        {tab !== "earnings" && visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-20 text-center">
            <span className="mb-3 text-5xl">📋</span>
            <p className="text-base font-bold" style={{ color: "#0a2e30" }}>No bookings here yet</p>
            <p className="mt-1 text-sm text-gray-400">
              {tab === "requests" ? "New booking requests from dog owners will appear here." : "Nothing to show for this category."}
            </p>
          </div>
        ) : tab !== "earnings" && (
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
                  onClick={() => router.push(`/booking/${b.id}${unreadMsgBookings.has(b.id) ? "?tab=messages" : ""}`)}
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
                            style={{ backgroundColor: "#2563eb" }}
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
                            style={{ backgroundColor: "#0284c7" }}
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

        {/* ── Sponsored ── */}
        <div className="mt-6">
          <PetcitiAd image="/ads/petciti-pitbull.jpg" variant="poster" />
        </div>
      </div>
    </div>
  );
}
