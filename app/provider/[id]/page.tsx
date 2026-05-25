"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

type ServiceId =
  | "pet_sitting"
  | "doggy_daycare"
  | "dog_boarding"
  | "mobile_grooming"
  | "dog_walking";

type ProviderProfile = {
  id: string;
  user_id: string;
  bio: string | null;
  services: ServiceId[];
  rates: Record<string, number>;
  availability: Record<string, { available: boolean; start?: string; end?: string }>;
  rating_avg: number;
  review_count: number;
  verified: boolean;
  active: boolean;
  neighbourhood: string | null;
  years_experience: number | null;
  avatar_url: string | null;
  gallery_photos: string[];
  users: { name: string } | { name: string }[] | null;
};

type Review = {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  users: { name: string } | { name: string }[] | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

const SERVICES: Record<ServiceId, { label: string; emoji: string; unit: string }> = {
  pet_sitting:     { label: "Pet Sitting",     emoji: "🐾", unit: "/ visit"  },
  doggy_daycare:   { label: "Doggy Daycare",   emoji: "🏡", unit: "/ day"    },
  dog_boarding:    { label: "Dog Boarding",    emoji: "🛏️", unit: "/ night"  },
  mobile_grooming: { label: "Mobile Grooming", emoji: "✂️", unit: "/ session"},
  dog_walking:     { label: "Dog Walking",     emoji: "🦮", unit: "/ walk"   },
};

const DAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

const PALETTE = [
  "#00b096", "#0a7c6e", "#059669", "#0d9488",
  "#0891b2", "#6366f1", "#8b5cf6", "#ec4899",
];

// ── Small utilities ────────────────────────────────────────────────────────

const bg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function resolveUser(u: ProviderProfile["users"]): { name: string } | null {
  if (!u) return null;
  return Array.isArray(u) ? u[0] ?? null : u;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function minRate(rates: Record<string, number>) {
  const vals = Object.values(rates);
  return vals.length ? Math.min(...vals) : null;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Stars({ v, lg }: { v: number; lg?: boolean }) {
  return (
    <span className={`inline-flex gap-px leading-none ${lg ? "text-2xl" : "text-sm"}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= Math.round(v) ? "#f59e0b" : "#e5e7eb" }}>★</span>
      ))}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-extrabold" style={{ color: "#0a2e30" }}>{title}</h2>
      {children}
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProviderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [authed,   setAuthed]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [missing,  setMissing]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const [{ data: p }, { data: rv }, { data: { user } }] = await Promise.all([
        sb.from("providers")
          .select(`id, user_id, bio, services, rates, availability,
                   rating_avg, review_count, verified, active, neighbourhood,
                   years_experience, avatar_url, gallery_photos,
                   users!user_id(name)`)
          .eq("id", id)
          .single(),
        sb.from("reviews")
          .select("id, rating, text, created_at, users!owner_id(name)")
          .eq("provider_id", id)
          .order("created_at", { ascending: false }),
        sb.auth.getUser(),
      ]);
      if (cancelled) return;
      if (!p) { setMissing(true); setLoading(false); return; }
      setProvider(p as unknown as ProviderProfile);
      setReviews((rv ?? []) as unknown as Review[]);
      setAuthed(!!user);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <p className="text-2xl font-bold text-white">Dog<span style={{ color: "#00b096" }}>Care</span>GH</p>
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading profile…</p>
    </div>
  );

  if (missing || !provider) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50">
      <span className="text-6xl">🐾</span>
      <h1 className="text-xl font-extrabold" style={{ color: "#0a2e30" }}>Provider not found</h1>
      <Link href="/search" className="text-sm font-semibold hover:underline" style={{ color: "#00b096" }}>
        ← Back to search
      </Link>
    </div>
  );

  const pUser    = resolveUser(provider.users);
  const name     = pUser?.name ?? "DogCare Provider";
  const avgRating = Number(provider.rating_avg);
  const starting  = minRate(provider.rates);
  const hasAvail  = Object.keys(provider.availability).length > 0;

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
        <Link href="/search" className="text-sm text-white/60 transition hover:text-white">
          ← Search results
        </Link>
      </nav>

      {/* ── Hero ── */}
      <div className="px-6 pb-14 pt-10 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">

            {/* Avatar */}
            <div className="relative shrink-0">
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={name}
                  className="h-28 w-28 rounded-2xl object-cover shadow-2xl shadow-black/40"
                />
              ) : (
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-2xl text-3xl font-extrabold text-white shadow-2xl shadow-black/40"
                  style={{ backgroundColor: bg(provider.user_id) }}
                >
                  {ini(name)}
                </div>
              )}
              {/* Available dot */}
              {provider.active && (
                <span
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#0a2e30] px-2.5 py-0.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: "#00b096" }}
                >
                  Available
                </span>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                <h1 className="text-3xl font-extrabold text-white">{name}</h1>
                {provider.verified && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ backgroundColor: "rgba(0,176,150,.15)", color: "#00b096" }}
                  >
                    ✓ Verified
                  </span>
                )}
              </div>

              {provider.neighbourhood && (
                <p className="mt-1.5 text-sm text-white/60">📍 {provider.neighbourhood}</p>
              )}
              {provider.neighbourhood && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                <div className="mt-3 overflow-hidden rounded-xl shadow-md" style={{ maxWidth: 340 }}>
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(provider.neighbourhood + ", Accra, Ghana")}&zoom=14`}
                    width="100%"
                    height="160"
                    style={{ border: 0, display: "block" }}
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Provider location"
                  />
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <Stars v={avgRating} lg />
                <span className="text-2xl font-extrabold text-white">
                  {avgRating > 0 ? avgRating.toFixed(1) : "New"}
                </span>
                <span className="text-sm text-white/50">
                  {provider.review_count > 0
                    ? `${provider.review_count} review${provider.review_count !== 1 ? "s" : ""}`
                    : "No reviews yet"}
                </span>
              </div>

              {provider.years_experience != null && (
                <p className="mt-2.5 text-sm text-white/60">
                  🏅 {provider.years_experience} year{provider.years_experience !== 1 ? "s" : ""} of experience
                </p>
              )}

              {/* Service pills */}
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {provider.services.map(s => (
                  <span
                    key={s}
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-white/80"
                    style={{ backgroundColor: "rgba(255,255,255,.1)" }}
                  >
                    {SERVICES[s]?.emoji} {SERVICES[s]?.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-32 md:px-8">

        {/* About */}
        <SectionCard title="About">
          {provider.bio ? (
            <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
              {provider.bio}
            </p>
          ) : (
            <p className="text-sm italic text-gray-400">
              This provider hasn&apos;t added a bio yet.
            </p>
          )}
        </SectionCard>

        {/* Services & Rates */}
        <SectionCard title="Services &amp; Rates">
          <div className="grid gap-3 sm:grid-cols-2">
            {provider.services.map(svc => {
              const meta = SERVICES[svc];
              const rate = provider.rates[svc];
              return (
                <div
                  key={svc}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                  style={{ borderLeftWidth: 3, borderLeftColor: "#00b096" }}
                >
                  <span className="text-2xl">{meta?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>
                      {meta?.label}
                    </p>
                    <p className="text-xs text-gray-400">{meta?.unit}</p>
                  </div>
                  {rate !== undefined ? (
                    <p className="shrink-0 text-base font-extrabold" style={{ color: "#00b096" }}>
                      GHS {rate}
                    </p>
                  ) : (
                    <p className="shrink-0 text-xs text-gray-400">On request</p>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Gallery */}
        <SectionCard title="Photo Gallery">
          {provider.gallery_photos?.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {provider.gallery_photos.map((url, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={url}
                    alt={`Gallery photo ${i + 1}`}
                    className="h-full w-full object-cover transition duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-14 text-center">
              <span className="mb-2 text-4xl">📷</span>
              <p className="text-sm font-medium text-gray-500">No photos yet</p>
              <p className="mt-1 text-xs text-gray-400">
                This provider hasn&apos;t uploaded photos of their space yet.
              </p>
            </div>
          )}
        </SectionCard>

        {/* Availability */}
        <SectionCard title="Weekly Availability">
          {hasAvail ? (
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map(day => {
                const slot = provider.availability[day];
                const on   = slot == null || slot.available !== false;
                return (
                  <div key={day} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      {day.slice(0, 3)}
                    </span>
                    <div
                      className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition"
                      style={on
                        ? { backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }
                        : { backgroundColor: "#f3f4f6", color: "#d1d5db" }}
                    >
                      {on ? "✓" : "—"}
                    </div>
                    {slot?.start && (
                      <span className="text-[9px] leading-none text-gray-400">{slot.start}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <span className="mb-2 text-4xl">📅</span>
              <p className="text-sm font-medium text-gray-600">Contact for availability</p>
              <p className="mt-1 text-xs text-gray-400">
                This provider hasn&apos;t set their weekly schedule yet.
              </p>
            </div>
          )}
        </SectionCard>

        {/* Reviews */}
        <SectionCard title={`Reviews${provider.review_count > 0 ? ` (${provider.review_count})` : ""}`}>
          {/* Summary bar */}
          {avgRating > 0 && (
            <div
              className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: "rgba(0,176,150,.07)" }}
            >
              <Stars v={avgRating} lg />
              <span className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
                {avgRating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                average across {provider.review_count} review{provider.review_count !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <span className="mb-2 text-4xl">💬</span>
              <p className="text-sm font-medium text-gray-500">No reviews yet</p>
              <p className="mt-1 text-xs text-gray-400">Be the first to leave a review!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reviews.map(r => {
                const rUser = resolveUser(r.users);
                const rName = rUser?.name ?? "Anonymous";
                return (
                  <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: bg(r.id) }}
                      >
                        {ini(rName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>
                            {rName}
                          </p>
                          <p className="shrink-0 text-xs text-gray-400">{fmt(r.created_at)}</p>
                        </div>
                        <div className="mt-0.5">
                          <Stars v={r.rating} />
                        </div>
                        {r.text && (
                          <p className="mt-2 text-sm leading-relaxed text-gray-600">{r.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Sticky booking bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 px-6 py-4 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{name}</p>
            <p className="text-xs text-white/50">
              {provider.neighbourhood ?? "Ghana"}
              {starting !== null && <> · From GHS {starting}</>}
            </p>
          </div>
          <button
            onClick={() => {
              if (!authed) {
                router.push(`/login?redirect=/provider/${id}`);
              } else {
                router.push(`/book/${id}`);
              }
            }}
            className="shrink-0 rounded-2xl px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "#00b096" }}
          >
            {authed ? "Request Booking" : "Sign in to Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
