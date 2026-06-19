"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { StarRating, RatingBadge } from "@/components/star-rating";
import { SERVICE_META } from "@/lib/service-meta";

// ── Types ──────────────────────────────────────────────────────────────────

type AvailSlot = { available: boolean; start?: string; end?: string };

type ProviderService = {
  id: string;
  rate_small: number | null;
  rate_medium: number | null;
  rate_large: number | null;
  availability: Record<string, AvailSlot>;
  service_types: { slug: string; name: string; emoji: string; rate_unit: string };
};

type ProviderProfile = {
  id: string;
  user_id: string;
  bio: string | null;
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
  body: string | null;
  created_at: string;
  users: { name: string } | { name: string }[] | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

const DAYS: { id: string; short: string }[] = [
  { id: "monday",    short: "Mon" },
  { id: "tuesday",   short: "Tue" },
  { id: "wednesday", short: "Wed" },
  { id: "thursday",  short: "Thu" },
  { id: "friday",    short: "Fri" },
  { id: "saturday",  short: "Sat" },
  { id: "sunday",    short: "Sun" },
];

const PALETTE = [
  "#00b096", "#0a7c6e", "#059669", "#0d9488",
  "#0891b2", "#2563eb", "#0284c7", "#ec4899",
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

function lowestPrice(svcs: ProviderService[]): number | null {
  const prices: number[] = [];
  for (const s of svcs) {
    if (s.rate_small  != null) prices.push(s.rate_small);
    if (s.rate_medium != null) prices.push(s.rate_medium);
    if (s.rate_large  != null) prices.push(s.rate_large);
  }
  return prices.length ? Math.min(...prices) : null;
}

// ── Sub-components ─────────────────────────────────────────────────────────


function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-extrabold" style={{ color: "#0a2e30" }}>{title}</h2>
      {children}
    </section>
  );
}

function ServiceRateCard({ svc, providerId, authed }: { svc: ProviderService; providerId: string; authed: boolean }) {
  const { name, emoji, rate_unit } = svc.service_types;
  const meta = SERVICE_META[svc.service_types.slug as keyof typeof SERVICE_META];
  const hasRates = svc.rate_small != null || svc.rate_medium != null || svc.rate_large != null;
  const activeDays = DAYS.filter(d => svc.availability?.[d.id]?.available === true);

  const href = authed ? `/book/${providerId}?service=${svc.id}` : `/login?redirect=/book/${providerId}?service=${svc.id}`;

  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition hover:border-[#00b096] hover:shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: "#00b096" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{name}</p>
          <p className="text-xs text-gray-400">{rate_unit}</p>
        </div>
      </div>
      {meta?.description && (
        <p className="mb-3 text-xs leading-relaxed text-gray-500">{meta.description}</p>
      )}

      {hasRates ? (
        <div className="space-y-1">
          {svc.rate_small != null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Small dog</span>
              <span className="font-semibold" style={{ color: "#00b096" }}>
                GHS {Number(svc.rate_small).toFixed(2)}
              </span>
            </div>
          )}
          {svc.rate_medium != null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Medium dog</span>
              <span className="font-semibold" style={{ color: "#00b096" }}>
                GHS {Number(svc.rate_medium).toFixed(2)}
              </span>
            </div>
          )}
          {svc.rate_large != null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Large dog</span>
              <span className="font-semibold" style={{ color: "#00b096" }}>
                GHS {Number(svc.rate_large).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">On request</p>
      )}

      {activeDays.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Schedule</p>
          <div className="flex flex-wrap gap-1">
            {activeDays.map(({ id, short }) => {
              const slot = svc.availability[id];
              return (
                <div key={id} className="rounded-lg px-2 py-1 text-center" style={{ backgroundColor: "rgba(0,176,150,.08)" }}>
                  <p className="text-[11px] font-bold" style={{ color: "#00b096" }}>{short}</p>
                  {slot?.start && slot?.end && (
                    <p className="text-[9px] leading-tight text-gray-400">{slot.start}–{slot.end}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end">
        <span className="text-xs font-semibold" style={{ color: "#00b096" }}>Book this service →</span>
      </div>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProviderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [provider,  setProvider]  = useState<ProviderProfile | null>(null);
  const [services,  setServices]  = useState<ProviderService[]>([]);
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [authed,    setAuthed]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [missing,   setMissing]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const [res, { data: { user } }] = await Promise.all([
        fetch(`/api/providers/${id}`),
        sb.auth.getUser(),
      ]);
      if (cancelled) return;
      if (!res.ok) { setMissing(true); setLoading(false); return; }
      const { provider: p, services: sv, reviews: rv } = await res.json();
      if (!p) { setMissing(true); setLoading(false); return; }
      setProvider(p as unknown as ProviderProfile);
      setAuthed(!!user);
      setServices((sv ?? []) as unknown as ProviderService[]);
      setReviews((rv ?? []) as unknown as Review[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
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

  const pUser     = resolveUser(provider.users);
  const name      = pUser?.name ?? "DogCare Provider";
  const avgRating = Number(provider.rating_avg);
  const starting  = lowestPrice(services);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
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

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <StarRating value={avgRating} size="lg" />
                <span className="text-2xl font-extrabold text-white">
                  {avgRating > 0 ? avgRating.toFixed(1) : "New"}
                </span>
                <RatingBadge avg={avgRating} count={provider.review_count} />
              </div>

              {provider.years_experience != null && (
                <p className="mt-2.5 text-sm text-white/60">
                  🏅 {provider.years_experience} year{provider.years_experience !== 1 ? "s" : ""} of experience
                </p>
              )}

              {/* Service pills */}
              {services.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {services.map(s => (
                    <span
                      key={s.id}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-white/80"
                      style={{ backgroundColor: "rgba(255,255,255,.1)" }}
                    >
                      {s.service_types.emoji} {s.service_types.name}
                    </span>
                  ))}
                </div>
              )}
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
        {services.length > 0 && (
          <SectionCard title="Services &amp; Rates">
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map(svc => (
                <ServiceRateCard key={svc.id} svc={svc} providerId={id} authed={authed} />
              ))}
            </div>
          </SectionCard>
        )}

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

        {/* Reviews */}
        <SectionCard title={`Reviews${provider.review_count > 0 ? ` (${provider.review_count})` : ""}`}>
          {avgRating > 0 && (
            <div
              className="mb-5 flex items-center gap-4 rounded-xl px-4 py-3"
              style={{ backgroundColor: "rgba(0,176,150,.07)" }}
            >
              <StarRating value={avgRating} size="md" />
              <div>
                <span className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
                  {avgRating.toFixed(1)}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  / 5 · {provider.review_count} review{provider.review_count !== 1 ? "s" : ""}
                </span>
              </div>
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
                          <StarRating value={r.rating} />
                        </div>
                        {r.body && (
                          <p className="mt-2 text-sm leading-relaxed text-gray-600">{r.body}</p>
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
              {starting !== null && <> · From GHS {starting.toFixed(2)}</>}
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
