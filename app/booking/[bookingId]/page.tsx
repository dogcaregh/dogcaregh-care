"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

type BookingDetail = {
  id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  gross_amount: number;
  status: string;
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

// ── Constants ──────────────────────────────────────────────────────────────

const SERVICES: Record<string, { label: string; emoji: string }> = {
  pet_sitting:     { label: "Pet Sitting",     emoji: "🐾" },
  doggy_daycare:   { label: "Doggy Daycare",   emoji: "🏡" },
  dog_boarding:    { label: "Dog Boarding",    emoji: "🛏️" },
  mobile_grooming: { label: "Mobile Grooming", emoji: "✂️" },
  dog_walking:     { label: "Dog Walking",     emoji: "🦮" },
};

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function resolveUser(u: { name: string } | { name: string }[] | null | undefined) {
  if (!u) return null;
  return Array.isArray(u) ? u[0] ?? null : u;
}

const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];
function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function BookingConfirmPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data } = await sb
        .from("bookings")
        .select(`
          id, service_type, start_date, end_date, gross_amount, status, created_at,
          providers!provider_id(id, neighbourhood, avatar_url, user_id, users!user_id(name)),
          dogs!dog_id(name)
        `)
        .eq("id", bookingId)
        .single();
      setBooking(data as unknown as BookingDetail);
      setLoading(false);
    }
    load();
  }, [bookingId]);

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <p className="text-2xl font-bold text-white">Dog<span style={{ color: "#00b096" }}>Care</span>GH</p>
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  if (!booking) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50">
      <span className="text-6xl">🐾</span>
      <p className="font-bold" style={{ color: "#0a2e30" }}>Booking not found</p>
      <Link href="/" className="text-sm font-semibold hover:underline" style={{ color: "#00b096" }}>
        Go home
      </Link>
    </div>
  );

  const provider     = booking.providers;
  const providerUser = resolveUser(provider?.users);
  const providerName = providerUser?.name ?? "Your Provider";
  const svc          = SERVICES[booking.service_type];
  const sameDay      = booking.start_date === booking.end_date;

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
      </nav>

      <div className="mx-auto max-w-lg px-4 py-16 text-center">

        {/* ── Success icon ── */}
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(0,176,150,.12)" }}
        >
          <svg
            className="h-10 w-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00b096"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold" style={{ color: "#0a2e30" }}>Request Sent!</h1>
        <p className="mt-2 text-gray-500">
          Your booking request has been sent to{" "}
          <span className="font-semibold text-gray-700">{providerName}</span>.
        </p>

        {/* ── Reference number ── */}
        <div className="mx-auto mt-6 w-fit rounded-2xl border border-gray-200 bg-white px-6 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Booking Reference
          </p>
          <p
            className="mt-1 font-mono text-2xl font-extrabold tracking-wider"
            style={{ color: "#0a2e30" }}
          >
            #{shortRef(booking.id)}
          </p>
        </div>

        {/* ── Provider strip ── */}
        {provider && (
          <div className="mt-4 flex items-center justify-center gap-3">
            {provider.avatar_url ? (
              <img
                src={provider.avatar_url}
                alt={providerName}
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: avatarBg(provider.user_id) }}
              >
                {ini(providerName)}
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{providerName}</p>
              {provider.neighbourhood && (
                <p className="text-xs text-gray-400">📍 {provider.neighbourhood}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Booking summary ── */}
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left">
          <p className="mb-4 text-sm font-bold" style={{ color: "#0a2e30" }}>Booking Summary</p>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Service</dt>
              <dd className="font-semibold" style={{ color: "#0a2e30" }}>
                {svc?.emoji} {svc?.label}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Dog</dt>
              <dd className="font-semibold" style={{ color: "#0a2e30" }}>
                {booking.dogs?.name ?? "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between">
              <dt className="text-gray-500">{sameDay ? "Date" : "Dates"}</dt>
              <dd className="text-right font-semibold" style={{ color: "#0a2e30" }}>
                {sameDay ? (
                  fmtDate(booking.start_date)
                ) : (
                  <>
                    {fmtDate(booking.start_date)}
                    <br />
                    <span className="text-gray-400">→</span> {fmtDate(booking.end_date)}
                  </>
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <dt className="text-gray-500">Total</dt>
              <dd className="text-base font-extrabold" style={{ color: "#0a2e30" }}>
                GHS {Number(booking.gross_amount).toFixed(2)}
              </dd>
            </div>
          </dl>
        </div>

        {/* ── 24-hour notice ── */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-left">
          <span className="text-xl">⏰</span>
          <p className="text-sm leading-relaxed text-amber-700">
            <span className="font-semibold">{providerName}</span> has{" "}
            <span className="font-semibold">24 hours</span> to accept or decline your request.
            You&apos;ll receive a notification once they respond.
          </p>
        </div>

        {/* ── CTAs ── */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to Home
          </Link>
          <Link
            href="/search"
            className="rounded-2xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#00b096" }}
          >
            Browse More Providers
          </Link>
        </div>
      </div>
    </div>
  );
}
