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
};

const AUTO_DISMISS_MS = 4000;

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

  useEffect(() => {
    // Tiny delay so the CSS transition fires
    const enter = setTimeout(() => setShow(true), 10);
    timerRef.current = setTimeout(() => {
      setShow(false);
      setTimeout(onDismiss, 300);
    }, AUTO_DISMISS_MS);
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
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl shadow-black/15 transition-all duration-300"
      style={{
        opacity:   show ? 1 : 0,
        transform: show ? "translateX(0)" : "translateX(110%)",
        minWidth:  240,
        maxWidth:  300,
      }}
    >
      <span className="mt-0.5 shrink-0 text-lg">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
      <p className="flex-1 text-xs leading-snug text-gray-700">{n.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-gray-300 transition hover:text-gray-500"
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

  // Auto-open the minimized chat bubble when a message arrives and chat is closed
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

  // Show at most 3 toasts at a time
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
