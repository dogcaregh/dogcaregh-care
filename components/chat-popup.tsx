"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useChat } from "@/lib/chat-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProviderRow = {
  id: string;
  user_id: string;
  avatar_url: string | null;
};

type BookingInfo = {
  id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  status: string;
  owner_id: string;
  providers: ProviderRow | ProviderRow[] | null;
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

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", paid: "Paid",
  in_progress: "In Progress", completed_pending: "Completing",
  closed: "Closed", cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#d97706", confirmed: "#0891b2", paid: "#7c3aed",
  in_progress: "#059669", completed_pending: "#9333ea",
  closed: "#10b981", cancelled: "#dc2626",
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

function avatarBg(s: string) { return PALETTE[s.charCodeAt(0) % PALETTE.length]; }

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, userId }: { name: string; avatarUrl: string | null; userId: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="h-7 w-7 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div
      className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
      style={{ backgroundColor: avatarBg(userId) }}
    >
      {ini(name)}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ cls = "h-4 w-4" }: { cls?: string }) {
  return (
    <svg className={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Chat Popup ───────────────────────────────────────────────────────────────

export function ChatPopup() {
  const { openBookingId, isMinimized, closeChat, toggleMinimize } = useChat();

  const [booking, setBooking]       = useState<BookingInfo | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [me, setMe]                 = useState<Party | null>(null);
  const [other, setOther]           = useState<Party | null>(null);
  const [bkLoading, setBkLoading]   = useState(false);
  const [unread, setUnread]         = useState(0);

  const [text, setText]             = useState("");
  const [sending, setSending]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [lightbox, setLightbox]     = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const meRef          = useRef<Party | null>(null);

  // Keep meRef current so Realtime callbacks can read it without stale closure
  useEffect(() => { meRef.current = me; }, [me]);

  // Request notification permission lazily when a chat is first opened
  useEffect(() => {
    if (openBookingId && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [openBookingId]);

  // ── Load booking + auth + history ─────────────────────────────────────────
  useEffect(() => {
    if (!openBookingId) {
      setBooking(null); setMessages([]); setMe(null); setOther(null);
      return;
    }
    let cancelled = false;
    setBkLoading(true);

    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user || cancelled) { setBkLoading(false); return; }

      const [bkRes, msgsRes, meRes] = await Promise.all([
        sb.from("bookings").select(`
          id, service_type, start_date, end_date, status, owner_id,
          providers!provider_id(id, user_id, avatar_url),
          users!owner_id(name)
        `).eq("id", openBookingId).single(),
        sb.from("messages").select("*").eq("booking_id", openBookingId).order("created_at", { ascending: true }),
        sb.from("users").select("name").eq("id", user.id).single(),
      ]);

      if (cancelled) return;

      const bk = bkRes.data as unknown as BookingInfo;
      if (!bk) { setBkLoading(false); return; }

      const provider  = resolve(bk.providers as ProviderRow | ProviderRow[] | null);
      const ownerRow  = resolve(bk.users as { name: string } | { name: string }[] | null);
      const isOwner   = user.id === bk.owner_id;
      const isProvider = !!provider && provider.user_id === user.id;

      if (!isOwner && !isProvider) { setBkLoading(false); return; }

      // Get other party name
      let otherName = "Unknown";
      if (isOwner) {
        // Need provider name — fetch separately (already have provider row but not name)
        const { data: pu } = await sb.from("users").select("name").eq("id", provider?.user_id ?? "").single();
        otherName = (pu as { name: string } | null)?.name ?? "Provider";
      } else {
        otherName = ownerRow?.name ?? "Owner";
      }

      if (cancelled) return;

      setMe({
        userId: user.id,
        name: meRes.data?.name ?? "You",
        avatarUrl: isProvider ? (provider?.avatar_url ?? null) : null,
        role: isOwner ? "owner" : "provider",
      });

      setOther({
        userId: isOwner ? (provider?.user_id ?? "") : bk.owner_id,
        name: otherName,
        avatarUrl: isOwner ? (provider?.avatar_url ?? null) : null,
        role: isOwner ? "provider" : "owner",
      });

      setBooking(bk);
      setMessages((msgsRes.data ?? []) as Message[]);
      setBkLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [openBookingId]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!openBookingId) return;
    const sb = createClient();
    const ch = sb
      .channel(`popup-msgs:${openBookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${openBookingId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (isMinimized) setUnread(n => n + 1);
          // Show browser notification when the message is from the other party
          // and the user is not actively viewing the chat
          if (
            msg.sender_id !== meRef.current?.userId &&
            (document.hidden || isMinimized) &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            new Notification("New message — DogCareGH", {
              body: msg.content ?? "You received a photo.",
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [openBookingId, isMinimized]);

  // Clear unread when un-minimizing
  useEffect(() => { if (!isMinimized) setUnread(0); }, [isMinimized]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // ── Send text ─────────────────────────────────────────────────────────────
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !me || sending) return;
    const body  = text.trim();
    const tmpId = crypto.randomUUID();
    const optimistic: Message = {
      id: tmpId, booking_id: openBookingId!, sender_id: me.userId,
      content: body, photo_url: null, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setText("");
    setSending(true);
    const sb = createClient();
    const { data, error } = await sb
      .from("messages")
      .insert({ booking_id: openBookingId, sender_id: me.userId, content: body })
      .select().single();
    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === tmpId ? (data as Message) : m));
    } else {
      setMessages(prev => prev.filter(m => m.id !== tmpId));
    }
    setSending(false);
  }

  // ── Upload photo ──────────────────────────────────────────────────────────
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me || !openBookingId) return;
    setUploading(true);
    const sb   = createClient();
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${openBookingId}/${me.userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("booking-updates").upload(path, file);
    if (!upErr) {
      const { data: { publicUrl } } = sb.storage.from("booking-updates").getPublicUrl(path);
      await sb.from("messages").insert({ booking_id: openBookingId, sender_id: me.userId, photo_url: publicUrl });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Nothing open ─────────────────────────────────────────────────────────
  if (!openBookingId) return null;

  const svc         = booking ? SERVICES[booking.service_type] : null;
  const sameDay     = booking ? booking.start_date === booking.end_date : false;
  const statusColor = booking ? (STATUS_COLOR[booking.status] ?? "#9ca3af") : "#9ca3af";
  const canMessage  = booking?.status !== "cancelled" && booking?.status !== "closed";

  // ── Minimized ─────────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex cursor-pointer select-none items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl shadow-black/30 transition hover:opacity-95"
        style={{ backgroundColor: "#0a2e30", minWidth: 220 }}
        onClick={toggleMinimize}
      >
        <span className="text-base">💬</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">
            {other ? other.name.split(" ")[0] : "Chat"}
            {booking && (
              <span className="ml-1.5 font-mono text-white/40">#{shortRef(booking.id)}</span>
            )}
          </p>
          <p className="text-[10px]" style={{ color: statusColor }}>
            {booking ? (STATUS_LABEL[booking.status] ?? booking.status) : "Loading…"}
          </p>
        </div>
        {unread > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#00b096" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); closeChat(); }}
          className="ml-1 shrink-0 text-white/30 transition hover:text-white/80"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>
    );
  }

  // ── Full popup ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Photo" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >✕</button>
        </div>
      )}

      {/* Popup shell */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
        style={{
          width: "clamp(320px, 90vw, 400px)",
          height: "clamp(400px, 70vh, 560px)",
          backgroundColor: "#fff",
        }}
      >
        {/* ── Header ── */}
        <div
          className="shrink-0 px-4 py-3"
          style={{ backgroundColor: "#0a2e30" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {other ? other.name.split(" ")[0] : "Chat"}
                </span>
                {booking && (
                  <span className="font-mono text-[10px] text-white/40">
                    #{shortRef(booking.id)}
                  </span>
                )}
                {booking && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: "rgba(255,255,255,.1)", color: statusColor }}
                  >
                    {STATUS_LABEL[booking.status] ?? booking.status}
                  </span>
                )}
              </div>
              {booking && svc && (
                <p className="mt-0.5 truncate text-[11px] text-white/50">
                  {svc.emoji} {svc.label}
                  {" · "}
                  {sameDay ? fmtDate(booking.start_date) : `${fmtDate(booking.start_date)} → ${fmtDate(booking.end_date)}`}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {/* Full-page link */}
              {booking && (
                <Link
                  href={`/booking/${booking.id}`}
                  title="Open full page"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              )}
              {/* Minimize */}
              <button
                type="button"
                onClick={toggleMinimize}
                title="Minimise"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                </svg>
              </button>
              {/* Close */}
              <button
                type="button"
                onClick={closeChat}
                title="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Dispute notice ── */}
        <div className="shrink-0 flex items-center gap-1.5 border-b border-gray-100 bg-amber-50 px-4 py-1.5">
          <svg className="h-3 w-3 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-[10px] text-amber-700">All messages are recorded and may be used to resolve disputes.</p>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {bkLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner cls="h-5 w-5 text-[#00b096]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="text-3xl">💬</span>
              <p className="text-xs font-semibold text-gray-500">No messages yet</p>
              <p className="max-w-[220px] text-[11px] text-gray-400">
                {me?.role === "provider"
                  ? "Send the owner a welcome message or photo update."
                  : "Tell your provider about your dog and what you need — it helps them decide if they're the right fit."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map(msg => {
                const isFromMe = msg.sender_id === me?.userId;
                const sender   = isFromMe ? me : other;

                return (
                  <div key={msg.id} className={`flex items-end gap-1.5 ${isFromMe ? "flex-row-reverse" : "flex-row"}`}>
                    {!isFromMe && sender && (
                      <Avatar name={sender.name} avatarUrl={sender.avatarUrl} userId={sender.userId} />
                    )}

                    <div className={`flex max-w-[75%] flex-col gap-0.5 ${isFromMe ? "items-end" : "items-start"}`}>
                      {msg.photo_url && (
                        <button
                          type="button"
                          onClick={() => setLightbox(msg.photo_url!)}
                          className="overflow-hidden rounded-xl focus:outline-none"
                        >
                          <img
                            src={msg.photo_url}
                            alt="Photo"
                            className="block max-w-[200px] rounded-xl object-cover hover:opacity-95 transition"
                            style={{ maxHeight: 180 }}
                          />
                        </button>
                      )}
                      {msg.content && (
                        <div
                          className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                            isFromMe
                              ? "rounded-br-sm text-white"
                              : "rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm"
                          }`}
                          style={isFromMe ? { backgroundColor: "#00b096" } : {}}
                        >
                          {msg.content}
                        </div>
                      )}
                      <span className="px-1 text-[9px] text-gray-400">{fmtTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input ── */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2.5">
          {!canMessage ? (
            <p className="text-center text-[11px] text-gray-400">
              Messaging disabled — booking is {booking?.status}.
            </p>
          ) : (
            <form onSubmit={sendMessage} className="flex items-center gap-1.5">
              {me?.role === "provider" && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    title="Send photo update"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
                  >
                    {uploading
                      ? <Spinner cls="h-3.5 w-3.5 text-[#00b096]" />
                      : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )
                    }
                  </button>
                </>
              )}

              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={me?.role === "provider" ? "Message owner…" : "Message provider…"}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400"
                disabled={sending}
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#00b096" }}
              >
                {sending
                  ? <Spinner cls="h-3.5 w-3.5 text-white" />
                  : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
