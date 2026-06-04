"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { NotificationsBell } from "@/components/notifications-bell";

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus =
  | "pending" | "confirmed" | "paid" | "in_progress"
  | "completed_pending" | "closed" | "cancelled";

type ProviderRow = {
  id: string;
  user_id: string;
  avatar_url: string | null;
  neighbourhood: string | null;
  users: { name: string } | { name: string }[] | null;
};

type DogRow = {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  age: number | null;
  vaccination_status: boolean;
  leash_trained: boolean | null;
};

type OwnerRow = {
  name: string;
  avatar_url: string | null;
  location: string | null;
};

type BookingDetail = {
  id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  selected_dates: string[] | null;
  preferred_time: string | null;
  preferred_end_time: string | null;
  duration_hours: number | null;
  gross_amount: number;
  provider_payout: number;
  status: BookingStatus;
  owner_id: string;
  created_at: string;
  providers: ProviderRow | ProviderRow[] | null;
  dogs: DogRow | DogRow[] | null;
  additional_dog_ids: string[] | null;
  users: OwnerRow | OwnerRow[] | null;
};

type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string | null;
  photo_url: string | null;
  created_at: string;
};

type Party = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "provider";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES: Record<string, { label: string; emoji: string }> = {
  dog_sitting:  { label: "Dog Sitting",  emoji: "🐾" },
  dog_daycare:  { label: "Dog Daycare",  emoji: "🏡" },
  dog_boarding: { label: "Dog Overnight", emoji: "🛏️" },
  dog_grooming: { label: "Dog Grooming", emoji: "✂️" },
  dog_walking:  { label: "Dog Walking",  emoji: "🦮" },
};

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string; desc: string }> = {
  pending:           { label: "Pending",              color: "#d97706", bg: "rgba(251,191,36,.12)", desc: "Waiting for provider to respond"         },
  confirmed:         { label: "Payment Due",          color: "#0891b2", bg: "rgba(8,145,178,.10)",  desc: "Provider accepted — pay now to confirm"  },
  paid:              { label: "Paid",                 color: "#059669", bg: "rgba(5,150,105,.10)",  desc: "Payment received, service upcoming"       },
  in_progress:       { label: "In Progress",          color: "#6366f1", bg: "rgba(99,102,241,.10)", desc: "Service is currently underway"            },
  completed_pending: { label: "Awaiting Confirmation",color: "#8b5cf6", bg: "rgba(139,92,246,.10)", desc: "Provider marked done — confirm to close"  },
  closed:            { label: "Closed",               color: "#10b981", bg: "rgba(16,185,129,.10)", desc: "Service complete — all done!"             },
  cancelled:         { label: "Cancelled",            color: "#dc2626", bg: "rgba(220,38,38,.08)",  desc: "This booking was cancelled"               },
};

const STATUS_STEPS: BookingStatus[] = [
  "pending", "confirmed", "paid", "in_progress", "completed_pending", "closed",
];

const SIZE_LABEL: Record<string, string> = {
  small: "Small", medium: "Medium", large: "Large", xlarge: "XL",
};

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolve<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function avatarBg(s: string) {
  return PALETTE[s.charCodeAt(0) % PALETTE.length];
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function groupByDay(messages: Message[]) {
  const groups: { label: string; msgs: Message[] }[] = [];
  let lastDay = "";
  for (const msg of messages) {
    const day = new Date(msg.created_at).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long",
    });
    if (day !== lastDay) { groups.push({ label: day, msgs: [] }); lastDay = day; }
    groups[groups.length - 1].msgs.push(msg);
  }
  return groups;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, userId, size = "md" }: {
  name: string; avatarUrl: string | null; userId: string; size?: "sm" | "md" | "lg";
}) {
  const cls: Record<string, string> = {
    sm: "h-8 w-8 text-xs rounded-full",
    md: "h-10 w-10 text-sm rounded-full",
    lg: "h-16 w-16 text-lg rounded-2xl",
  };
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${cls[size]} shrink-0 object-cover`} />;
  return (
    <div
      className={`${cls[size]} shrink-0 flex items-center justify-center font-bold text-white`}
      style={{ backgroundColor: avatarBg(userId) }}
    >
      {ini(name)}
    </div>
  );
}

function StatusTrack({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="text-xs font-medium text-red-500">Cancelled</span>
      </div>
    );
  }
  const idx = STATUS_STEPS.indexOf(status as BookingStatus);
  return (
    <div className="flex items-center gap-0.5">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-0.5">
          <div
            className="h-2 w-2 rounded-full transition-all"
            style={{ backgroundColor: i <= idx ? "#00b096" : "#d1d5db" }}
            title={s.replace(/_/g, " ")}
          />
          {i < STATUS_STEPS.length - 1 && (
            <div className="h-px w-4 transition-all" style={{ backgroundColor: i < idx ? "#00b096" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewCard({
  title, prompt, existingReview, starPick, starHover, reviewBody,
  submitting, error, onStarPick, onStarHover, onBodyChange, onSubmit,
}: {
  title: string;
  prompt: string;
  existingReview: { rating: number; body: string | null } | null;
  starPick: number; starHover: number; reviewBody: string;
  submitting: boolean; error: string | null;
  onStarPick: (n: number) => void;
  onStarHover: (n: number) => void;
  onBodyChange: (s: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      {existingReview ? (
        <div>
          <div className="mb-2 flex gap-0.5">
            {[1,2,3,4,5].map(n => (
              <span key={n} className="text-2xl leading-none" style={{ color: n <= existingReview.rating ? "#f59e0b" : "#e5e7eb" }}>★</span>
            ))}
          </div>
          {existingReview.body && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{existingReview.body}</p>
          )}
          <p className="mt-3 text-xs font-semibold" style={{ color: "#00b096" }}>✓ Review submitted</p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm font-medium text-gray-700">{prompt}</p>
          <div className="mb-3 flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => onStarHover(n)}
                onMouseLeave={() => onStarHover(0)}
                onClick={() => onStarPick(n)}
                className="text-3xl leading-none transition-transform hover:scale-110 active:scale-95"
                style={{ color: n <= (starHover || starPick) ? "#f59e0b" : "#e5e7eb" }}
              >★</button>
            ))}
          </div>
          <textarea
            value={reviewBody}
            onChange={e => onBodyChange(e.target.value)}
            placeholder="Share your experience (optional)…"
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#00b096] focus:bg-white focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">{reviewBody.length}/500</span>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <button
            onClick={onSubmit}
            disabled={starPick === 0 || submitting}
            className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#00b096" }}
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<"details" | "messages">("details");

  // Open messages tab directly when navigated from a message notification
  useEffect(() => {
    if (searchParams.get("tab") === "messages") setTab("messages");
  }, [searchParams]);
  const [booking,      setBooking]      = useState<BookingDetail | null>(null);
  const [extraDogs,    setExtraDogs]    = useState<{ id: string; name: string; breed: string | null; age: number | null; size: string | null; vaccination_status: boolean; leash_trained: boolean | null }[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [me,       setMe]       = useState<Party | null>(null);
  const [other,    setOther]    = useState<Party | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(false);
  const [paying,   setPaying]   = useState(false);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [uploading,setUploading]= useState(false);
  const [lightbox,       setLightbox]       = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Dispute state
  const [disputeRaised,      setDisputeRaised]      = useState(false);
  const [disputeModalOpen,   setDisputeModalOpen]   = useState(false);
  const [disputeReason,      setDisputeReason]      = useState("");
  const [disputeDesc,        setDisputeDesc]        = useState("");
  const [submittingDispute,  setSubmittingDispute]  = useState(false);
  const [disputeError,       setDisputeError]       = useState<string | null>(null);

  // Review state
  const [existingReview,   setExistingReview]   = useState<{ rating: number; body: string | null } | null>(null);
  const [reviewLoaded,     setReviewLoaded]     = useState(false);
  const [starPick,         setStarPick]         = useState(0);
  const [starHover,        setStarHover]        = useState(0);
  const [reviewBody,       setReviewBody]       = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError,      setReviewError]      = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const reviewRef      = useRef<HTMLDivElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.push(`/login?redirect=/booking/${bookingId}`); return; }

      const [apiRes, msgsRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`),
        sb.from("messages").select("*").eq("booking_id", bookingId).order("created_at", { ascending: true }),
      ]);

      if (!apiRes.ok) { setLoading(false); return; }
      const { booking: bk, review: rvData } = await apiRes.json();
      if (!bk) { setLoading(false); return; }

      const typedBk  = bk as unknown as BookingDetail;
      const provider     = resolve(typedBk.providers as ProviderRow | ProviderRow[] | null);
      const providerUser = resolve(provider?.users ?? null);
      const ownerRow     = resolve(typedBk.users as OwnerRow | OwnerRow[] | null);
      const isOwner    = user.id === typedBk.owner_id;
      const isProvider = !!provider && provider.user_id === user.id;

      if (!isOwner && !isProvider) { router.push("/"); return; }

      setMe({
        userId:    user.id,
        name:      isOwner ? (ownerRow?.name ?? "You") : (providerUser?.name ?? "You"),
        avatarUrl: isProvider ? (provider?.avatar_url ?? null) : (ownerRow?.avatar_url ?? null),
        role:      isOwner ? "owner" : "provider",
      });

      setOther(
        isOwner
          ? { userId: provider?.user_id ?? "", name: providerUser?.name ?? "Provider", avatarUrl: provider?.avatar_url ?? null, role: "provider" }
          : { userId: typedBk.owner_id, name: ownerRow?.name ?? "Owner", avatarUrl: ownerRow?.avatar_url ?? null, role: "owner" }
      );

      if (typedBk.additional_dog_ids && typedBk.additional_dog_ids.length > 0) {
        const { data: extraData } = await sb.from("dogs").select("id, name, breed, age, size, vaccination_status, leash_trained").in("id", typedBk.additional_dog_ids);
        setExtraDogs((extraData ?? []) as { id: string; name: string; breed: string | null; age: number | null; size: string | null; vaccination_status: boolean; leash_trained: boolean | null }[]);
      }

      setBooking(typedBk);
      setMessages((msgsRes.data ?? []) as Message[]);
      setExistingReview(rvData ? { rating: rvData.rating, body: rvData.body } : null);
      setReviewLoaded(true);
      setLoading(false);
    }
    load();
  }, [bookingId, router]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(`booking-msgs:${bookingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
      )
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [bookingId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === "messages") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  // Scroll to review form when arriving via ?review=1
  useEffect(() => {
    if (!loading && searchParams.get("review") === "1" && reviewRef.current) {
      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [loading, searchParams]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function updateStatus(status: BookingStatus) {
    if (!booking || updating) return;
    setUpdating(true);
    const sb = createClient();
    const { error } = await sb.from("bookings").update({ status }).eq("id", booking.id);
    if (error) {
      console.error("[updateStatus] error:", error);
    } else {
      setBooking(prev => prev ? { ...prev, status } : prev);
    }
    // Show review modal whenever owner closes — even if DB update failed, the intent is clear.
    // The review insert itself will fail gracefully if the booking isn't actually closed.
    if (status === "closed" && me?.role === "owner" && !existingReview) {
      setShowReviewModal(true);
    }
    setUpdating(false);
  }

  async function handlePayment() {
    if (!booking || paying) return;
    setPaying(true);
    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        alert(data.error ?? "Could not start payment. Please try again.");
        setPaying(false);
      }
    } catch {
      alert("Could not start payment. Please try again.");
      setPaying(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !me || sending) return;
    const body  = text.trim();
    const tmpId = crypto.randomUUID();
    const optimistic: Message = { id: tmpId, booking_id: bookingId, sender_id: me.userId, content: body, photo_url: null, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    setText("");
    setSending(true);
    const sb = createClient();
    const { data, error } = await sb.from("messages").insert({ booking_id: bookingId, sender_id: me.userId, content: body }).select().single();
    if (!error && data) setMessages(prev => prev.map(m => m.id === tmpId ? (data as Message) : m));
    else setMessages(prev => prev.filter(m => m.id !== tmpId));
    setSending(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    setUploading(true);
    const sb  = createClient();
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${bookingId}/${me.userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("booking-updates").upload(path, file, { upsert: false });
    if (upErr) { setUploading(false); return; }
    const { data: { publicUrl } } = sb.storage.from("booking-updates").getPublicUrl(path);
    await sb.from("messages").insert({ booking_id: bookingId, sender_id: me.userId, photo_url: publicUrl });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Submit dispute ────────────────────────────────────────────────────────
  async function submitDispute() {
    if (!booking || !disputeReason) return;
    setSubmittingDispute(true);
    setDisputeError(null);
    const res = await fetch("/api/disputes", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingId: booking.id, reason: disputeReason, description: disputeDesc }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDisputeError(data.error ?? "Failed to submit dispute. Please try again.");
    } else {
      setDisputeRaised(true);
      setDisputeModalOpen(false);
      setDisputeReason("");
      setDisputeDesc("");
    }
    setSubmittingDispute(false);
  }

  // ── Submit review ─────────────────────────────────────────────────────────
  async function submitReview() {
    if (starPick === 0 || !booking || !me) return;
    const prov     = resolve(booking.providers as ProviderRow | ProviderRow[] | null);
    const toUserId = me.role === "owner" ? (prov?.user_id ?? "") : booking.owner_id;
    if (!toUserId) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const sb = createClient();
      const { error } = await sb.from("reviews").insert({
        booking_id:   bookingId,
        from_user_id: me.userId,
        to_user_id:   toUserId,
        from_role:    me.role,
        rating:       starPick,
        body:         reviewBody.trim() || null,
      });
      if (error) {
        setReviewError(error.message);
      } else {
        setExistingReview({ rating: starPick, body: reviewBody.trim() || null });
      }
    } catch {
      setReviewError("Failed to submit. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  }

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  if (!booking || !me) return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gray-50">
      <span className="text-6xl">🐾</span>
      <p className="font-bold" style={{ color: "#0a2e30" }}>Booking not found</p>
      <Link href="/" className="text-sm font-semibold hover:underline" style={{ color: "#00b096" }}>Go home</Link>
    </div>
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const provider      = resolve(booking.providers as ProviderRow | ProviderRow[] | null);
  const providerUser  = resolve(provider?.users ?? null);
  const ownerRow      = resolve(booking.users as OwnerRow | OwnerRow[] | null);
  const dog           = resolve(booking.dogs as DogRow | DogRow[] | null);
  const svc           = SERVICES[booking.service_type];
  const statusMeta    = STATUS_META[booking.status] ?? STATUS_META.pending;
  const sameDay       = booking.start_date === booking.end_date;
  const isOwner       = me.role === "owner";
  const isProvider    = me.role === "provider";
  const providerFullName = providerUser?.name ?? "DogCare Provider";
  const ownerFullName    = ownerRow?.name ?? "Pet Owner";
  const dayGroups     = groupByDay(messages);

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Photo update" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
          <button className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      {/* Dispute modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => setDisputeModalOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-extrabold" style={{ color: "#0a2e30" }}>Raise a Dispute</p>
                <p className="mt-0.5 text-sm text-gray-500">Tell us what went wrong with {providerFullName.split(" ")[0]}&apos;s service</p>
              </div>
              <button onClick={() => setDisputeModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200">✕</button>
            </div>
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">Reason *</label>
              <select
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
              >
                <option value="">Select a reason</option>
                <option value="service_not_delivered">Service not delivered</option>
                <option value="provider_no_show">Provider no-show</option>
                <option value="poor_service_quality">Poor service quality</option>
                <option value="property_damage">Property damage</option>
                <option value="other">Other</option>
              </select>
            </div>
            <textarea
              value={disputeDesc}
              onChange={e => setDisputeDesc(e.target.value)}
              maxLength={800}
              placeholder="Describe what happened (optional but helpful)…"
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
            />
            <div className="mt-1 mb-2 flex justify-end">
              <span className="text-[10px] text-gray-400">{disputeDesc.length}/800</span>
            </div>
            {disputeError && <p className="mb-2 text-xs text-red-500">{disputeError}</p>}
            <button
              onClick={submitDispute}
              disabled={!disputeReason || submittingDispute}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#d97706" }}
            >
              {submittingDispute ? "Submitting…" : "Submit Dispute"}
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400">Our team will review your dispute within 24 hours.</p>
          </div>
        </div>
      )}

      {/* Review modal — pops up after owner confirms service complete */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => setShowReviewModal(false)}>
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-extrabold" style={{ color: "#0a2e30" }}>Rate Your Provider</p>
                <p className="mt-0.5 text-sm text-gray-500">How was your experience with {providerFullName.split(" ")[0]}?</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
              >✕</button>
            </div>
            <ReviewCard
              title=""
              prompt=""
              existingReview={existingReview}
              starPick={starPick}
              starHover={starHover}
              reviewBody={reviewBody}
              submitting={submittingReview}
              error={reviewError}
              onStarPick={setStarPick}
              onStarHover={setStarHover}
              onBodyChange={setReviewBody}
              onSubmit={async () => { await submitReview(); setShowReviewModal(false); }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col" style={{ height: "100dvh", backgroundColor: "#f8fafb" }}>

        {/* Nav */}
        <nav className="shrink-0 flex items-center justify-between border-b border-white/10 px-5 py-3 md:px-8" style={{ backgroundColor: "#0a2e30" }}>
          <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link
              href={me.role === "provider" ? "/dashboard/provider" : "/dashboard/owner"}
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white"
            >
              ← Dashboard
            </Link>
          </div>
        </nav>

        {/* Tab bar */}
        <div className="shrink-0 flex border-b border-gray-100 bg-white shadow-sm">
          {(["details", "messages"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-3.5 text-sm font-semibold transition"
              style={
                tab === t
                  ? { borderBottom: "2px solid #00b096", color: "#0a2e30" }
                  : { borderBottom: "2px solid transparent", color: "#9ca3af" }
              }
            >
              {t === "details" ? "Booking Details" : `Messages${messages.length > 0 ? ` (${messages.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* ── Details tab ── */}
        {tab === "details" && (
          <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
            <div className="mx-auto max-w-2xl space-y-4 pb-8">

              {/* Booking ref card */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="h-1.5" style={{ backgroundColor: statusMeta.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Booking Reference</p>
                      <p className="mt-0.5 font-mono text-2xl font-extrabold" style={{ color: "#0a2e30" }}>#{shortRef(booking.id)}</p>
                    </div>
                    <span
                      className="mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                      style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{statusMeta.desc}</p>
                  <div className="mt-3">
                    <StatusTrack status={booking.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Service</p>
                      <p className="mt-0.5 text-gray-700">{svc?.emoji} {svc?.label}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {booking.selected_dates && booking.selected_dates.length > 1
                          ? `Dates (${booking.selected_dates.length})`
                          : sameDay ? "Date" : "Dates"}
                      </p>
                      {booking.selected_dates && booking.selected_dates.length > 0 ? (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {booking.selected_dates.map(d => (
                            <span key={d} className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: "rgba(0,176,150,.1)", color: "#00b096" }}>
                              {fmtDate(d)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-0.5 text-gray-700">
                          {sameDay ? fmtDate(booking.start_date) : `${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)}`}
                        </p>
                      )}
                    </div>
                    {booking.preferred_time && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Time</p>
                        <p className="mt-0.5 text-gray-700">
                          {booking.preferred_time.slice(0, 5)}
                          {booking.preferred_end_time && (
                            <span> – {booking.preferred_end_time.slice(0, 5)}</span>
                          )}
                          {booking.duration_hours && (
                            <span className="ml-1 text-gray-400">
                              · {booking.duration_hours} hr{booking.duration_hours !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Booked On</p>
                      <p className="mt-0.5 text-gray-700">{fmtDate(booking.created_at.split("T")[0])}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* People grid */}
              <div className="grid gap-3 sm:grid-cols-2">

                {/* Provider card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Provider</p>
                  <div className="flex items-center gap-3">
                    <Avatar name={providerFullName} avatarUrl={provider?.avatar_url ?? null} userId={provider?.user_id ?? "p"} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-bold" style={{ color: "#0a2e30" }}>{providerFullName}</p>
                      <p className="text-xs italic text-gray-400">DogCare Provider</p>
                      {provider?.neighbourhood && <p className="mt-0.5 text-xs text-gray-500">📍 {provider.neighbourhood}</p>}
                    </div>
                  </div>
                  {isOwner && provider && (
                    <Link
                      href={`/provider/${provider.id}`}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      View Profile →
                    </Link>
                  )}
                </div>

                {/* Owner card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Pet Owner</p>
                  <div className="flex items-center gap-3">
                    <Avatar name={ownerFullName} avatarUrl={ownerRow?.avatar_url ?? null} userId={booking.owner_id} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-bold" style={{ color: "#0a2e30" }}>{ownerFullName}</p>
                      <p className="text-xs italic text-gray-400">Pet Owner</p>
                      {ownerRow?.location && <p className="mt-0.5 text-xs text-gray-500">📍 {ownerRow.location}</p>}
                    </div>
                  </div>
                  {isProvider && (
                    <Link
                      href={`/owner-profile/${booking.owner_id}`}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      View Profile →
                    </Link>
                  )}
                </div>
              </div>

              {/* Dog card */}
              {dog && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Dog{extraDogs.length > 0 ? `s (${1 + extraDogs.length})` : ""}
                  </p>
                  <div className="space-y-3">
                    {[{ ...dog, isPrimary: true }, ...extraDogs.map(d => ({ ...d, isPrimary: false }))].map((d, i) => (
                      <Link key={i} href={`/dog/${"id" in d && d.id ? d.id : ""}`} className="flex items-center gap-4 rounded-xl transition hover:bg-gray-50 -mx-1 px-1 py-0.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl" style={{ backgroundColor: "rgba(0,176,150,.1)" }}>🐕</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold" style={{ color: "#0a2e30" }}>{d.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {[
                              "breed" in d ? d.breed : null,
                              d.size ? (SIZE_LABEL[d.size] ?? d.size) : null,
                              "age" in d && d.age ? `${d.age}y` : null,
                            ].filter(Boolean).join(" · ") || "No details"}
                          </p>
                        </div>
                        {"vaccination_status" in d && d.vaccination_status !== null && (
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={d.vaccination_status ? { background: "rgba(0,176,150,.12)", color: "#00b096" } : { background: "rgba(239,68,68,.1)", color: "#dc2626" }}>
                              {d.vaccination_status ? "Vaccinated" : "Unvaccinated"}
                            </span>
                            {"leash_trained" in d && d.leash_trained !== null && (
                              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                style={d.leash_trained ? { background: "rgba(0,176,150,.12)", color: "#00b096" } : { background: "rgba(239,68,68,.1)", color: "#dc2626" }}>
                                {d.leash_trained ? "🦮 Leash Trained" : "🦮 Not Leash Trained"}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Payment</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-xl font-extrabold" style={{ color: "#0a2e30" }}>
                      GHS {Number(booking.gross_amount).toFixed(2)}
                    </p>
                  </div>
                  {isProvider && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Your Payout</p>
                      <p className="text-xl font-extrabold" style={{ color: "#00b096" }}>
                        GHS {Number(booking.provider_payout).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5">

                {/* Message button */}
                <button
                  onClick={() => setTab("messages")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message {isOwner ? "Provider" : "Owner"}
                </button>

                {/* Review form — owner rates provider */}
                {booking.status === "closed" && isOwner && reviewLoaded && (
                  <div ref={reviewRef}>
                  <ReviewCard
                    title="Rate Your Provider"
                    prompt={`How was your experience with ${providerFullName.split(" ")[0]}?`}
                    existingReview={existingReview}
                    starPick={starPick}
                    starHover={starHover}
                    reviewBody={reviewBody}
                    submitting={submittingReview}
                    error={reviewError}
                    onStarPick={setStarPick}
                    onStarHover={setStarHover}
                    onBodyChange={setReviewBody}
                    onSubmit={submitReview}
                  />
                  </div>
                )}

                {/* Review form — provider rates owner */}
                {booking.status === "closed" && isProvider && reviewLoaded && (
                  <ReviewCard
                    title="Leave a Note on This Owner"
                    prompt={`How was working with ${ownerFullName.split(" ")[0]} and their dog?`}
                    existingReview={existingReview}
                    starPick={starPick}
                    starHover={starHover}
                    reviewBody={reviewBody}
                    submitting={submittingReview}
                    error={reviewError}
                    onStarPick={setStarPick}
                    onStarHover={setStarHover}
                    onBodyChange={setReviewBody}
                    onSubmit={submitReview}
                  />
                )}

                {/* Owner: Pay now */}
                {isOwner && booking.status === "confirmed" && (
                  <button
                    disabled={paying}
                    onClick={handlePayment}
                    className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#00b096" }}
                  >
                    {paying ? "Redirecting to Paystack…" : `💳 Pay Now — GHS ${Number(booking.gross_amount).toFixed(2)}`}
                  </button>
                )}

                {/* Owner: Confirm complete */}
                {isOwner && booking.status === "completed_pending" && (
                  <>
                    <button
                      disabled={updating}
                      onClick={() => updateStatus("closed")}
                      className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "#00b096" }}
                    >
                      {updating ? "Confirming…" : "✓ Confirm Service Complete"}
                    </button>
                    <p className="text-center text-xs text-gray-400">Confirming releases payment to the provider.</p>
                    {disputeRaised ? (
                      <div className="rounded-xl border border-amber-100 bg-amber-50 py-2 text-center text-xs font-medium text-amber-600">
                        ✓ Dispute raised — our team will review it
                      </div>
                    ) : (
                      <button
                        disabled={updating}
                        onClick={() => { setDisputeReason(""); setDisputeDesc(""); setDisputeError(null); setDisputeModalOpen(true); }}
                        className="w-full rounded-xl border border-amber-200 py-2 text-xs font-medium text-amber-600 transition hover:bg-amber-50 disabled:opacity-50"
                      >
                        Raise a Dispute
                      </button>
                    )}
                  </>
                )}

                {/* Owner: Cancel */}
                {isOwner && (booking.status === "pending" || booking.status === "confirmed") && (
                  <button
                    disabled={updating}
                    onClick={() => updateStatus("cancelled")}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    {updating ? "Cancelling…" : "Cancel Booking"}
                  </button>
                )}

                {/* Provider: Accept / Decline */}
                {isProvider && booking.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      disabled={updating}
                      onClick={() => updateStatus("confirmed")}
                      className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "#00b096" }}
                    >
                      {updating ? "…" : "✓ Accept Booking"}
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => updateStatus("cancelled")}
                      className="flex-1 rounded-xl border border-red-200 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {updating ? "…" : "Decline"}
                    </button>
                  </div>
                )}

                {/* Provider: Start service */}
                {isProvider && booking.status === "paid" && (
                  <button
                    disabled={updating}
                    onClick={() => updateStatus("in_progress")}
                    className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#6366f1" }}
                  >
                    {updating ? "Updating…" : "▶ Start Service"}
                  </button>
                )}

                {/* Provider: Mark complete */}
                {isProvider && booking.status === "in_progress" && (
                  <button
                    disabled={updating}
                    onClick={() => updateStatus("completed_pending")}
                    className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#8b5cf6" }}
                  >
                    {updating ? "Updating…" : "✓ Mark Service as Complete"}
                  </button>
                )}

                {/* Provider: Info banners */}
                {isProvider && booking.status === "confirmed" && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-600">
                    ⏳ Waiting for the owner to complete payment.
                  </div>
                )}
                {isProvider && booking.status === "completed_pending" && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-600">
                    ⏳ Waiting for the owner to confirm the service is complete.
                  </div>
                )}
                {isProvider && booking.status === "closed" && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <span className="text-base">✅</span>
                    <p className="text-xs font-medium text-emerald-700">
                      Service confirmed. Payout of{" "}
                      <strong>GHS {Number(booking.provider_payout).toFixed(2)}</strong> triggered.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Messages tab ── */}
        {tab === "messages" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-400">
                  <span className="text-5xl">💬</span>
                  <p className="text-sm font-semibold text-gray-500">No messages yet</p>
                  <p className="max-w-xs text-xs text-gray-400">
                    {me.role === "provider"
                      ? "Send the owner a welcome message or share a photo update during the service."
                      : "Tell your provider about your dog and what you need."}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {dayGroups.map(group => (
                    <div key={group.label}>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>
                      <div className="space-y-3">
                        {group.msgs.map(msg => {
                          const isFromMe = msg.sender_id === me.userId;
                          const sender   = isFromMe ? me : other;
                          return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isFromMe ? "flex-row-reverse" : "flex-row"}`}>
                              {!isFromMe && sender && (
                                <Avatar name={sender.name} avatarUrl={sender.avatarUrl} userId={sender.userId} size="sm" />
                              )}
                              <div className={`flex max-w-[72%] flex-col gap-1 ${isFromMe ? "items-end" : "items-start"}`}>
                                {msg.photo_url && (
                                  <button
                                    type="button"
                                    onClick={() => setLightbox(msg.photo_url!)}
                                    className="overflow-hidden rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00b096]/50"
                                  >
                                    <img
                                      src={msg.photo_url}
                                      alt="Photo update"
                                      className="block max-w-[240px] rounded-2xl object-cover transition hover:opacity-95 md:max-w-[320px]"
                                      style={{ maxHeight: 260 }}
                                    />
                                  </button>
                                )}
                                {msg.content && (
                                  <div
                                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                      isFromMe ? "rounded-br-sm text-white" : "rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm"
                                    }`}
                                    style={isFromMe ? { backgroundColor: "#00b096" } : {}}
                                  >
                                    {msg.content}
                                  </div>
                                )}
                                <span className="px-1 text-[10px] text-gray-400">{fmtTime(msg.created_at)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 md:px-8">
              {booking.status === "cancelled" || booking.status === "closed" ? (
                <p className="text-center text-xs text-gray-400">
                  This booking is {booking.status}. Messaging is disabled.
                </p>
              ) : (
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  {me.role === "provider" && (
                    <>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        title="Send a photo update"
                        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        {uploading ? (
                          <svg className="h-4 w-4 animate-spin text-[#00b096]" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                            <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        <span className="hidden sm:inline">Photo</span>
                      </button>
                    </>
                  )}
                  <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={me.role === "provider" ? "Message owner…" : "Message provider…"}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400"
                    disabled={sending}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: "#00b096" }}
                  >
                    {sending ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                        <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    )}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
