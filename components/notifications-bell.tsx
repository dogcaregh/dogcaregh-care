"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useNotifications, type AppNotification } from "@/lib/notifications-context";

const TYPE_EMOJI: Record<string, string> = {
  booking_confirmed:    "✅",
  booking_declined:     "❌",
  booking_cancelled:    "🚫",
  payment_received:     "💳",
  service_started:      "▶️",
  awaiting_confirmation:"⏳",
  payout_triggered:     "💰",
  new_message:          "💬",
};

function fmtTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationItem({
  n,
  onClose,
  onMarkRead,
}: {
  n: AppNotification;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}) {
  const emoji = TYPE_EMOJI[n.type] ?? "🔔";

  function handleClick() {
    if (!n.read) onMarkRead(n.id);
    onClose();
  }

  const inner = (
    <div
      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
      style={!n.read ? { backgroundColor: "rgba(0,176,150,.06)" } : {}}
    >
      <span className="mt-0.5 shrink-0 text-base">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-snug text-gray-700">{n.message}</p>
        <p className="mt-0.5 text-[10px] text-gray-400">{fmtTime(n.created_at)}</p>
      </div>
      {!n.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "#00b096" }} />
      )}
    </div>
  );

  if (n.booking_id) {
    const href = n.type === "new_message"
      ? `/booking/${n.booking_id}?tab=messages`
      : `/booking/${n.booking_id}`;
    return (
      <Link href={href} onClick={handleClick} className="block">
        {inner}
      </Link>
    );
  }
  return <div onClick={handleClick} className="cursor-default">{inner}</div>;
}

export function NotificationsBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:bg-white/10"
        aria-label="Notifications"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: "#00b096" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20"
          style={{ maxHeight: "70vh", maxWidth: "calc(100vw - 1rem)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }}>
                  {unreadCount} new
                </span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-semibold transition hover:opacity-70"
                style={{ color: "#00b096" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto p-2" style={{ maxHeight: "calc(70vh - 52px)" }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <span className="text-3xl">🔔</span>
                <p className="text-xs font-semibold text-gray-500">No notifications yet</p>
                <p className="text-[11px] text-gray-400">
                  You&apos;ll be notified when bookings change status or you receive a message.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {notifications.map(n => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onClose={() => setOpen(false)}
                    onMarkRead={markRead}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
