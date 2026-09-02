"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, type AppNotification } from "@/lib/notifications-context";
import { useChat } from "@/lib/chat-context";

const TYPE_EMOJI: Record<string, string> = {
  booking_confirmed:     "✅",
  booking_declined:      "❌",
  booking_cancelled:     "🚫",
  payment_received:      "💳",
  service_started:       "▶️",
  awaiting_confirmation: "⏳",
  payout_triggered:      "💰",
  new_message:           "💬",
  verification_approved: "🎉",
  verification_rejected: "⚠️",
};

// Accent colour + tinted background per notification type
const TYPE_ACCENT: Record<string, { color: string; bg: string }> = {
  booking_confirmed:     { color: "#0891b2", bg: "rgba(8,145,178,.07)"  },
  booking_declined:      { color: "#dc2626", bg: "rgba(220,38,38,.06)"  },
  booking_cancelled:     { color: "#dc2626", bg: "rgba(220,38,38,.06)"  },
  payment_received:      { color: "#059669", bg: "rgba(5,150,105,.07)"  },
  payout_triggered:      { color: "#059669", bg: "rgba(5,150,105,.07)"  },
  service_started:       { color: "#2563eb", bg: "rgba(37,99,235,.06)"  },
  awaiting_confirmation: { color: "#d97706", bg: "rgba(251,191,36,.08)" },
  new_message:           { color: "#00b096", bg: "rgba(0,176,150,.07)"  },
  verification_approved: { color: "#10b981", bg: "rgba(16,185,129,.07)" },
  verification_rejected: { color: "#dc2626", bg: "rgba(220,38,38,.06)"  },
};

const DEFAULT_ACCENT = { color: "#00b096", bg: "rgba(0,176,150,.07)" };

// High-importance notifications linger a bit longer
const DISMISS_MS: Record<string, number> = {
  booking_confirmed: 6000,
  payment_received:  6000,
  payout_triggered:  6000,
};
const DEFAULT_DISMISS_MS = 4000;

function Toast({
  n,
  onDismiss,
  href,
}: {
  n: AppNotification;
  onDismiss: () => void;
  href: string;
}) {
  const router  = useRouter();
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accent = TYPE_ACCENT[n.type] ?? DEFAULT_ACCENT;
  const dismissMs = DISMISS_MS[n.type] ?? DEFAULT_DISMISS_MS;

  useEffect(() => {
    const enter = setTimeout(() => setShow(true), 10);
    timerRef.current = setTimeout(() => {
      setShow(false);
      setTimeout(onDismiss, 300);
    }, dismissMs);
    return () => {
      clearTimeout(enter);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleClick() {
    onDismiss();
    router.push(href);
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
    setTimeout(onDismiss, 300);
  }

  return (
    <div
      onClick={handleClick}
      className="flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/20 transition-all duration-300"
      style={{
        opacity:     show ? 1 : 0,
        transform:   show ? "translateX(0)" : "translateX(110%)",
        minWidth:    248,
        maxWidth:    308,
        borderLeft:  `4px solid ${accent.color}`,
        backgroundColor: accent.bg,
      }}
    >
      {/* Emoji pill */}
      <span
        className="ml-3 mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base"
        style={{ backgroundColor: `${accent.color}18` }}
      >
        {TYPE_EMOJI[n.type] ?? "🔔"}
      </span>

      <p className="flex-1 py-3 pr-1 text-xs font-medium leading-snug text-gray-800">
        {n.message}
      </p>

      <button
        type="button"
        onClick={handleDismiss}
        className="mr-3 mt-3 shrink-0 text-gray-300 transition hover:text-gray-500"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function NotificationToaster() {
  const { toastQueue, dismissToast } = useNotifications();
  const { openBookingId, openChatMinimized } = useChat();

  useEffect(() => {
    const latest = toastQueue[toastQueue.length - 1];
    if (
      latest?.type === "new_message" &&
      latest.booking_id &&
      !openBookingId
    ) {
      openChatMinimized(latest.booking_id);
    }
  }, [toastQueue]);

  const visible = toastQueue.slice(-3);
  if (visible.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-20 z-[70] flex flex-col gap-2"
      style={{ pointerEvents: "none" }}
    >
      {visible.map(n => (
        <div key={n.id} style={{ pointerEvents: "auto" }}>
          <Toast
            n={n}
            onDismiss={() => dismissToast(n.id)}
            href={
              n.booking_id
                ? `/booking/${n.booking_id}${n.type === "new_message" ? "?tab=messages" : ""}`
                : "/dashboard/owner"
            }
          />
        </div>
      ))}
    </div>
  );
}
