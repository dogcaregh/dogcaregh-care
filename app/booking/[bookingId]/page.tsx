"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProviderRow = {
  id: string;
  user_id: string;
  avatar_url: string | null;
  neighbourhood: string | null;
  users: { name: string } | { name: string }[] | null;
};

type BookingDetail = {
  id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  gross_amount: number;
  status: string;
  owner_id: string;
  created_at: string;
  providers: ProviderRow | ProviderRow[] | null;
  dogs: { name: string; breed: string | null } | { name: string; breed: string | null }[] | null;
  users: { name: string } | { name: string }[] | null;
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
  pet_sitting:     { label: "Pet Sitting",     emoji: "🐾" },
  doggy_daycare:   { label: "Doggy Daycare",   emoji: "🏡" },
  dog_boarding:    { label: "Dog Boarding",    emoji: "🛏️" },
  mobile_grooming: { label: "Mobile Grooming", emoji: "✂️" },
  dog_walking:     { label: "Dog Walking",     emoji: "🦮" },
};

const STATUS_STEPS = ["pending", "confirmed", "paid", "in_progress", "completed_pending", "closed"];

const STATUS_LABELS: Record<string, string> = {
  pending:           "Pending",
  confirmed:         "Confirmed",
  paid:              "Paid",
  in_progress:       "In Progress",
  completed_pending: "Completing",
  closed:            "Closed",
  cancelled:         "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending:           "bg-amber-50 text-amber-700",
  confirmed:         "bg-blue-50 text-blue-700",
  paid:              "bg-purple-50 text-purple-700",
  in_progress:       "bg-teal-50 text-teal-700",
  completed_pending: "bg-orange-50 text-orange-700",
  closed:            "bg-green-50 text-green-700",
  cancelled:         "bg-red-50 text-red-700",
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
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
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
    if (day !== lastDay) {
      groups.push({ label: day, msgs: [] });
      lastDay = day;
    }
    groups[groups.length - 1].msgs.push(msg);
  }
  return groups;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name, avatarUrl, userId, size = "sm",
}: {
  name: string; avatarUrl: string | null; userId: string; size?: "sm" | "md";
}) {
  const cls = size === "sm"
    ? "h-8 w-8 text-xs rounded-full"
    : "h-10 w-10 text-sm rounded-full";

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${cls} shrink-0 object-cover`} />;
  }
  return (
    <div
      className={`${cls} shrink-0 flex items-center justify-center font-bold text-white`}
      style={{ backgroundColor: avatarBg(userId) }}
    >
      {ini(name)}
    </div>
  );
}

// ─── StatusTrack ─────────────────────────────────────────────────────────────

function StatusTrack({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="text-xs font-medium text-red-500">Cancelled</span>
      </div>
    );
  }
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0.5">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-0.5">
          <div
            className="h-2 w-2 rounded-full transition-all"
            style={{ backgroundColor: i <= idx ? "#00b096" : "#d1d5db" }}
            title={STATUS_LABELS[s]}
          />
          {i < STATUS_STEPS.length - 1 && (
            <div
              className="h-px w-3 transition-all"
              style={{ backgroundColor: i < idx ? "#00b096" : "#e5e7eb" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking]           = useState<BookingDetail | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [me, setMe]                     = useState<Party | null>(null);
  const [other, setOther]               = useState<Party | null>(null);
  const [loading, setLoading]           = useState(true);
  const [text, setText]                 = useState("");
  const [sending, setSending]           = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [lightbox, setLightbox]         = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  // ── Load booking + parties + history ──────────────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        router.push(`/login?redirect=/booking/${bookingId}`);
        return;
      }

      const [bkRes, msgsRes, meRes] = await Promise.all([
        sb
          .from("bookings")
          .select(`
            id, service_type, start_date, end_date, gross_amount, status, owner_id, created_at,
            providers!provider_id(id, user_id, avatar_url, neighbourhood, users!user_id(name)),
            dogs!dog_id(name, breed),
            users!owner_id(name)
          `)
          .eq("id", bookingId)
          .single(),
        sb
          .from("messages")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: true }),
        sb.from("users").select("name").eq("id", user.id).single(),
      ]);

      const bk = bkRes.data as unknown as BookingDetail;
      if (!bk) { setLoading(false); return; }

      const provider     = resolve(bk.providers as ProviderRow | ProviderRow[] | null);
      const providerUser = resolve(provider?.users ?? null);
      const isOwner      = user.id === bk.owner_id;
      const isProvider   = !!provider && provider.user_id === user.id;

      if (!isOwner && !isProvider) { router.push("/"); return; }

      const ownerRow = resolve(bk.users as { name: string } | { name: string }[] | null);

      setMe({
        userId:    user.id,
        name:      meRes.data?.name ?? "You",
        avatarUrl: isProvider ? (provider?.avatar_url ?? null) : null,
        role:      isOwner ? "owner" : "provider",
      });

      setOther(
        isOwner
          ? {
              userId:    provider?.user_id ?? "",
              name:      providerUser?.name ?? "Provider",
              avatarUrl: provider?.avatar_url ?? null,
              role:      "provider",
            }
          : {
              userId:    bk.owner_id,
              name:      ownerRow?.name ?? "Owner",
              avatarUrl: null,
              role:      "owner",
            }
      );

      setBooking(bk);
      setMessages((msgsRes.data ?? []) as Message[]);
      setLoading(false);
    }
    load();
  }, [bookingId, router]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`booking-msgs:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages(prev =>
            prev.some(m => m.id === msg.id) ? prev : [...prev, msg]
          );
        }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [bookingId]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send text message ─────────────────────────────────────────────────────
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !me || sending) return;

    const body  = text.trim();
    const tmpId = crypto.randomUUID();
    const optimistic: Message = {
      id: tmpId, booking_id: bookingId, sender_id: me.userId,
      content: body, photo_url: null, created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    setText("");
    setSending(true);

    const sb = createClient();
    const { data, error } = await sb
      .from("messages")
      .insert({ booking_id: bookingId, sender_id: me.userId, content: body })
      .select()
      .single();

    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === tmpId ? (data as Message) : m));
    } else {
      setMessages(prev => prev.filter(m => m.id !== tmpId));
    }
    setSending(false);
  }

  // ── Upload photo (providers only) ─────────────────────────────────────────
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;

    setUploading(true);
    const sb  = createClient();
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${bookingId}/${me.userId}/${Date.now()}.${ext}`;

    const { error: upErr } = await sb.storage
      .from("booking-updates")
      .upload(path, file, { upsert: false });

    if (upErr) {
      console.error("Upload failed:", upErr.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = sb.storage
      .from("booking-updates")
      .getPublicUrl(path);

    await sb.from("messages").insert({
      booking_id: bookingId,
      sender_id:  me.userId,
      photo_url:  publicUrl,
    });

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-2xl font-bold text-white">
          Dog<span style={{ color: "#00b096" }}>Care</span>GH
        </p>
        <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
      </div>
    );
  }

  if (!booking || !me) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gray-50">
        <span className="text-6xl">🐾</span>
        <p className="font-bold" style={{ color: "#0a2e30" }}>Booking not found</p>
        <Link href="/" className="text-sm font-semibold hover:underline" style={{ color: "#00b096" }}>
          Go home
        </Link>
      </div>
    );
  }

  const provider  = resolve(booking.providers as ProviderRow | ProviderRow[] | null);
  const dog       = resolve(booking.dogs as { name: string; breed: string | null } | { name: string; breed: string | null }[] | null);
  const svc       = SERVICES[booking.service_type];
  const sameDay   = booking.start_date === booking.end_date;
  const statusCls = STATUS_COLORS[booking.status] ?? STATUS_COLORS.pending;
  const dayGroups = groupByDay(messages);

  return (
    <>
      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Photo update"
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Full-height flex shell ── */}
      <div className="flex flex-col bg-gray-50" style={{ height: "100dvh" }}>

        {/* ── Nav ── */}
        <nav
          className="shrink-0 flex items-center justify-between border-b border-white/10 px-5 py-3 md:px-8"
          style={{ backgroundColor: "#0a2e30" }}
        >
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            Dog<span style={{ color: "#00b096" }}>Care</span>GH
          </Link>
          <Link
            href={me.role === "provider" ? "/dashboard/provider" : "/dashboard/owner"}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            ← Dashboard
          </Link>
        </nav>

        {/* ── Booking summary strip ── */}
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 py-4 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Left: ref, status, service, dates, progress */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold" style={{ color: "#0a2e30" }}>
                  #{shortRef(booking.id)}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}>
                  {STATUS_LABELS[booking.status] ?? booking.status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-gray-500">
                {svc?.emoji} {svc?.label}
                {dog ? ` · ${dog.name}` : ""}
                {" · "}
                {sameDay
                  ? fmtDate(booking.start_date)
                  : `${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)}`}
              </p>
              <div className="mt-2">
                <StatusTrack status={booking.status} />
              </div>
            </div>

            {/* Right: other party */}
            {other && (
              <div className="flex items-center gap-2.5">
                <Avatar
                  name={other.name}
                  avatarUrl={other.avatarUrl}
                  userId={other.userId}
                  size="md"
                />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">
                    {other.role === "provider" ? "Your provider" : "Owner"}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>
                    {other.name.split(" ")[0]}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-400">
              <span className="text-5xl">💬</span>
              <p className="text-sm font-semibold text-gray-500">No messages yet</p>
              <p className="max-w-xs text-xs text-gray-400">
                {me.role === "provider"
                  ? "Send the owner a welcome message or share a photo update during the service."
                  : "Message your provider with any questions or special instructions."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {dayGroups.map(group => (
                <div key={group.label}>
                  {/* Day separator */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {group.label}
                    </span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>

                  {/* Messages for this day */}
                  <div className="space-y-3">
                    {group.msgs.map((msg) => {
                      const isFromMe = msg.sender_id === me.userId;
                      const sender   = isFromMe ? me : other;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isFromMe ? "flex-row-reverse" : "flex-row"}`}
                        >
                          {/* Avatar (other party only) */}
                          {!isFromMe && sender && (
                            <Avatar
                              name={sender.name}
                              avatarUrl={sender.avatarUrl}
                              userId={sender.userId}
                              size="sm"
                            />
                          )}

                          <div
                            className={`flex max-w-[72%] flex-col gap-1 ${
                              isFromMe ? "items-end" : "items-start"
                            }`}
                          >
                            {/* Photo message */}
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

                            {/* Text message */}
                            {msg.content && (
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                  isFromMe
                                    ? "rounded-br-sm text-white"
                                    : "rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm"
                                }`}
                                style={isFromMe ? { backgroundColor: "#00b096" } : {}}
                              >
                                {msg.content}
                              </div>
                            )}

                            <span className="px-1 text-[10px] text-gray-400">
                              {fmtTime(msg.created_at)}
                            </span>
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

        {/* ── Input bar ── */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 md:px-8">
          {booking.status === "cancelled" || booking.status === "closed" ? (
            <p className="text-center text-xs text-gray-400">
              This booking is {booking.status}. Messaging is disabled.
            </p>
          ) : (
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              {/* Photo upload — providers only */}
              {me.role === "provider" && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
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
                placeholder={
                  me.role === "provider"
                    ? "Message owner…"
                    : "Message provider…"
                }
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
      </div>
    </>
  );
}
