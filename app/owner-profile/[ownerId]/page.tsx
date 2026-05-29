"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useChat } from "@/lib/chat-context";

// ── Constants & helpers ────────────────────────────────────────────────────

const PALETTE   = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];
const avatarBg  = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];
const SIZE_LABEL: Record<string, string> = { small: "Small", medium: "Medium", large: "Large", xlarge: "XL" };
const SLUG_EMOJI: Record<string, string> = {
  dog_walking: "🦮", dog_sitting: "🐾", dog_daycare: "🏡",
  dog_boarding: "🛏️", dog_grooming: "✂️",
};
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: "Pending",      color: "#d97706", bg: "rgba(251,191,36,.12)" },
  confirmed:         { label: "Confirmed",     color: "#0891b2", bg: "rgba(8,145,178,.10)"  },
  paid:              { label: "Paid",          color: "#059669", bg: "rgba(5,150,105,.10)"  },
  in_progress:       { label: "In Progress",   color: "#6366f1", bg: "rgba(99,102,241,.10)" },
  completed_pending: { label: "Completing",    color: "#8b5cf6", bg: "rgba(139,92,246,.10)" },
  closed:            { label: "Closed",        color: "#10b981", bg: "rgba(16,185,129,.10)" },
  cancelled:         { label: "Cancelled",     color: "#dc2626", bg: "rgba(220,38,38,.08)"  },
};

function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// ── Types ──────────────────────────────────────────────────────────────────

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  size: "small" | "medium" | "large" | "xlarge" | null;
  age: number | null;
  temperament: string | null;
  vaccination_status: boolean;
  avatar_url: string | null;
};

type OwnerReview = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  users: { name: string } | { name: string }[] | null;
};

type Booking = {
  id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  status: string;
  gross_amount: number;
  created_at: string;
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function OwnerProfileForProvider() {
  const router  = useRouter();
  const params  = useParams();
  const ownerId = params.ownerId as string;
  const { openChat } = useChat();

  const [pageState,    setPageState]    = useState<"loading" | "unauthorized" | "ready">("loading");
  const [name,         setName]         = useState("");
  const [location,     setLocation]     = useState<string | null>(null);
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null);
  const [memberDate,   setMemberDate]   = useState<string | null>(null);
  const [dogs,         setDogs]         = useState<Dog[]>([]);
  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [ownerReviews, setOwnerReviews] = useState<OwnerReview[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: providerRow } = await sb
        .from("providers").select("id").eq("user_id", user.id).maybeSingle();
      if (!providerRow) { if (!cancelled) setPageState("unauthorized"); return; }

      // Gate: provider must have at least one booking with this owner
      const { data: check } = await sb
        .from("bookings").select("id")
        .eq("provider_id", providerRow.id).eq("owner_id", ownerId)
        .limit(1).maybeSingle();
      if (!check) { if (!cancelled) setPageState("unauthorized"); return; }

      const [{ data: u }, { data: dgs }, { data: rv }, { data: bks }] = await Promise.all([
        sb.from("users").select("name, location, avatar_url, created_at").eq("id", ownerId).single(),
        sb.from("dogs")
          .select("id, name, breed, size, age, temperament, vaccination_status, avatar_url")
          .eq("owner_id", ownerId).order("created_at"),
        sb.from("reviews")
          .select("id, rating, body, created_at, users!from_user_id(name)")
          .eq("to_user_id", ownerId).eq("from_role", "provider")
          .order("created_at", { ascending: false }),
        sb.from("bookings")
          .select("id, service_type, start_date, end_date, status, gross_amount, created_at")
          .eq("provider_id", providerRow.id).eq("owner_id", ownerId)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      const uRow = u as { name: string; location: string | null; avatar_url: string | null; created_at: string } | null;
      setName(uRow?.name ?? "");
      setLocation(uRow?.location ?? null);
      setAvatarUrl(uRow?.avatar_url ?? null);
      setMemberDate(uRow?.created_at ?? null);
      setDogs((dgs ?? []) as Dog[]);
      setOwnerReviews((rv ?? []) as unknown as OwnerReview[]);
      setBookings((bks ?? []) as Booking[]);
      setPageState("ready");
    }
    load();
    return () => { cancelled = true; };
  }, [router, ownerId]);

  if (pageState === "loading") return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading profile…</p>
    </div>
  );

  if (pageState === "unauthorized") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ backgroundColor: "#f8fafb" }}>
      <span className="mb-4 text-5xl">🔒</span>
      <h1 className="mb-2 text-xl font-extrabold" style={{ color: "#0a2e30" }}>Profile not accessible</h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        You can only view an owner&apos;s profile if you have an active or past booking with them.
      </p>
      <Link href="/dashboard/provider" className="rounded-full px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "#00b096" }}>
        Back to Dashboard
      </Link>
    </div>
  );

  const firstName      = name.split(" ")[0];
  const activeBooking  = bookings.find(b => !["cancelled", "closed"].includes(b.status));
  const totalSpend     = bookings.filter(b => b.status === "closed").reduce((s, b) => s + Number(b.gross_amount), 0);
  const completedCount = bookings.filter(b => b.status === "closed").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <Link href="/dashboard/provider" className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10">
          ← Dashboard
        </Link>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 space-y-6">

        {/* ── Profile card ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-2" style={{ backgroundColor: "#00b096" }} />
          <div className="p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              {avatarUrl ? (
                <img src={avatarUrl} alt={firstName} className="h-20 w-20 rounded-2xl object-cover shadow" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow"
                  style={{ backgroundColor: ownerId ? avatarBg(ownerId) : "#00b096" }}>
                  {ini(name)}
                </div>
              )}

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-xl font-extrabold" style={{ color: "#0a2e30" }}>{name || "—"}</p>
                <p className="mt-0.5 text-xs font-semibold" style={{ color: "#00b096" }}>Pet Owner</p>
                {location && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <span>📍</span>{location}
                  </p>
                )}
                {memberDate && (
                  <p className="mt-0.5 text-xs text-gray-400">Member since {memberSince(memberDate)}</p>
                )}
              </div>

              {/* Message button */}
              {activeBooking && (
                <button
                  type="button"
                  onClick={() => openChat(activeBooking.id)}
                  className="shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "#00b096" }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="mt-5 grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-gray-50">
              {[
                { label: "Bookings with you", value: bookings.length },
                { label: "Completed", value: completedCount },
                { label: "Total spent", value: totalSpend > 0 ? `GHS ${totalSpend.toFixed(0)}` : "—" },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col items-center py-3">
                  <p className="text-lg font-extrabold" style={{ color: "#0a2e30" }}>{stat.value}</p>
                  <p className="text-[10px] font-medium text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Dogs ── */}
        <div>
          <h2 className="mb-3 text-base font-extrabold" style={{ color: "#0a2e30" }}>
            {firstName ? `${firstName}'s Dogs` : "Dogs"}{dogs.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({dogs.length})</span>}
          </h2>
          {dogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
              No dogs on profile yet.
            </div>
          ) : (
            <div className="space-y-3">
              {dogs.map(dog => (
                <div key={dog.id} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  {dog.avatar_url ? (
                    <img src={dog.avatar_url} alt={dog.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: "rgba(0,176,150,0.1)" }}>🐕</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold" style={{ color: "#0a2e30" }}>{dog.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {[dog.breed, dog.size ? SIZE_LABEL[dog.size] : null, dog.age ? `${dog.age}y` : null].filter(Boolean).join(" · ") || "No details"}
                    </p>
                    {dog.temperament && (
                      <p className="mt-1 text-xs text-gray-400">🧠 {dog.temperament}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={dog.vaccination_status
                      ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                      : { background: "rgba(239,68,68,.1)", color: "#dc2626" }}>
                    {dog.vaccination_status ? "Vaccinated" : "Unvaccinated"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Booking history ── */}
        {bookings.length > 0 && (
          <div>
            <h2 className="mb-3 text-base font-extrabold" style={{ color: "#0a2e30" }}>Booking History</h2>
            <div className="space-y-2">
              {bookings.map(b => {
                const meta  = STATUS_META[b.status] ?? STATUS_META.pending;
                const emoji = SLUG_EMOJI[b.service_type] ?? "🐾";
                const sameDay = b.start_date === b.end_date;
                return (
                  <Link key={b.id} href={`/booking/${b.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <span className="text-2xl">{emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize" style={{ color: "#0a2e30" }}>
                        {b.service_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sameDay ? fmtDate(b.start_date) : `${fmtDate(b.start_date)} → ${fmtDate(b.end_date)}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      <p className="text-xs font-bold" style={{ color: "#0a2e30" }}>GHS {Number(b.gross_amount).toFixed(2)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Provider notes (reviews from other providers) ── */}
        {ownerReviews.length > 0 && (
          <div>
            <h2 className="mb-3 text-base font-extrabold" style={{ color: "#0a2e30" }}>Provider Notes</h2>
            <div className="space-y-3">
              {ownerReviews.map(r => {
                const rUser = Array.isArray(r.users) ? r.users[0] : r.users;
                return (
                  <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{rUser?.name ?? "Provider"}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-px">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className="text-base leading-none" style={{ color: n <= r.rating ? "#f59e0b" : "#e5e7eb" }}>★</span>
                      ))}
                    </div>
                    {r.body && <p className="mt-2 text-sm leading-relaxed text-gray-600">{r.body}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
