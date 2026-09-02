"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type ActionItem = {
  bookingId: string;
  serviceType: string;
  status: "confirmed" | "completed_pending" | "pending";
  grossAmount: number;
  startDate: string;
  otherPartyName: string | null;
};

const SERVICE_EMOJI: Record<string, string> = {
  dog_walking:  "🦮",
  dog_sitting:  "🐾",
  dog_daycare:  "🏡",
  dog_boarding: "🛏️",
  dog_grooming: "✂️",
  add_on:       "➕",
};

const SERVICE_LABEL: Record<string, string> = {
  dog_walking:  "Dog Walking",
  dog_sitting:  "Dog Sitting",
  dog_daycare:  "Dog Daycare",
  dog_boarding: "Dog Overnight",
  dog_grooming: "Dog Grooming",
  add_on:       "Add-on",
};

const ACTION_META: Record<ActionItem["status"], {
  label: string; cta: string;
  accent: string; bg: string; border: string;
}> = {
  confirmed: {
    label:  "Payment Due",
    cta:    "Pay Now",
    accent: "#0891b2",
    bg:     "rgba(8,145,178,.07)",
    border: "rgba(8,145,178,.22)",
  },
  completed_pending: {
    label:  "Confirm Completion",
    cta:    "Confirm",
    accent: "#7c3aed",
    bg:     "rgba(124,58,237,.06)",
    border: "rgba(124,58,237,.20)",
  },
  pending: {
    label:  "New Booking Request",
    cta:    "Review",
    accent: "#d97706",
    bg:     "rgba(251,191,36,.08)",
    border: "rgba(217,119,6,.22)",
  },
};

const SESSION_KEY = "dcgh-pending-modal-seen";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

export function PendingActionsModal({
  items,
  userName,
  dashboardHref,
}: {
  items: ActionItem[];
  userName: string | null;
  dashboardHref: string;
}) {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length === 0) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {}
    // Small delay so the dashboard has rendered first
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [items.length]);

  function dismiss() {
    setOpen(false);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) dismiss();
  }

  if (!open) return null;

  const firstName = userName?.split(" ")[0] ?? "there";
  const count = items.length;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(6,16,15,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30"
        style={{ maxHeight: "85dvh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="px-6 pb-4 pt-6" style={{ backgroundColor: "#0a2e30" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
            Action required
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-white">
            Hey {firstName} 👋
          </h2>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            You have{" "}
            <span className="font-bold text-white">{count} pending action{count !== 1 ? "s" : ""}</span>
            {" "}that need your attention.
          </p>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.map(item => {
            const meta    = ACTION_META[item.status];
            const emoji   = SERVICE_EMOJI[item.serviceType] ?? "📋";
            const svcName = SERVICE_LABEL[item.serviceType] ?? item.serviceType;
            return (
              <Link
                key={item.bookingId}
                href={`/booking/${item.bookingId}`}
                onClick={dismiss}
                className="block rounded-xl border p-4 transition hover:opacity-90 active:scale-[.99]"
                style={{ backgroundColor: meta.bg, borderColor: meta.border }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: meta.accent, color: "#fff" }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm font-bold truncate" style={{ color: "#0a2e30" }}>
                      {emoji} {svcName}
                    </p>
                    {item.otherPartyName && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        with {item.otherPartyName}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      {fmtDate(item.startDate)} · GHS {Number(item.grossAmount).toFixed(2)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    style={{ backgroundColor: meta.accent, color: "#fff" }}
                  >
                    {meta.cta} →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 px-4 py-4">
          <Link
            href={dashboardHref}
            onClick={dismiss}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            View Dashboard
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#00b096" }}
          >
            Got it ✓
          </button>
        </div>
      </div>
    </div>
  );
}
