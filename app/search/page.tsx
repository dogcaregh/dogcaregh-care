"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { lookupCoords, haversine, rankScore } from "@/lib/geocode";

// ── Types ──────────────────────────────────────────────────────────────────

type ServiceType = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
};

type AvailSlot = { available: boolean; start?: string; end?: string };

type ProviderService = {
  service_type_id: string;
  rate_small: number | null;
  rate_medium: number | null;
  rate_large: number | null;
  is_active: boolean;
  availability: Record<string, AvailSlot> | null;
  service_types: { slug: string; name: string; emoji: string } | null;
};

type Provider = {
  id: string;
  user_id: string;
  rating_avg: number;
  review_count: number;
  active: boolean;
  neighbourhood: string | null;
  avatar_url: string | null;
  lat: number | null;
  lng: number | null;
  users: { name: string } | { name: string }[] | null;
  provider_services: ProviderService[];
};

type RankedProvider = Provider & { distKm: number | null };

// ── Constants ──────────────────────────────────────────────────────────────

const PRICE_RANGES = [
  { label: "Any price",     min: 0,   max: Infinity },
  { label: "Under GHS 50",  min: 0,   max: 49       },
  { label: "GHS 50 – 100",  min: 50,  max: 100      },
  { label: "GHS 100 – 200", min: 101, max: 200      },
  { label: "GHS 200+",      min: 201, max: Infinity },
];

const AVATAR_PALETTE = [
  "#00b096", "#0a7c6e", "#059669", "#0d9488",
  "#0891b2", "#6366f1", "#8b5cf6", "#ec4899",
];

// ── Helpers ────────────────────────────────────────────────────────────────

function avatarBg(userId: string) {
  return AVATAR_PALETTE[userId.charCodeAt(0) % AVATAR_PALETTE.length];
}

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function minServicePrice(svcs: ProviderService[]): number | null {
  const prices: number[] = [];
  for (const ps of svcs) {
    if (ps.rate_small  != null) prices.push(ps.rate_small);
    if (ps.rate_medium != null) prices.push(ps.rate_medium);
    if (ps.rate_large  != null) prices.push(ps.rate_large);
  }
  return prices.length > 0 ? Math.min(...prices) : null;
}

const TODAY_KEY = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];

function isAvailableToday(svcs: ProviderService[]): boolean {
  return svcs.some(ps => {
    const a = ps.availability;
    if (!a || Object.keys(a).length === 0) return true; // no schedule set = always available
    return a[TODAY_KEY]?.available === true;
  });
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-px leading-none">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= Math.round(value) ? "#f59e0b" : "#e5e7eb" }}>★</span>
      ))}
    </span>
  );
}

function ProviderCard({ p, highlightTypeId }: { p: RankedProvider; highlightTypeId: string }) {
  const usersRow = Array.isArray(p.users) ? p.users[0] : p.users;
  const name     = usersRow?.name ?? "DogCare Provider";
  const activeSvcs = p.provider_services.filter(ps => ps.is_active);
  const price    = minServicePrice(activeSvcs);

  return (
    <Link href={`/provider/${p.id}`} className="group block">
      <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="h-1.5" style={{ backgroundColor: "#00b096" }} />

        <div className="flex flex-1 flex-col p-5">
          {/* Header row */}
          <div className="flex items-start gap-3">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: avatarBg(p.user_id) }}
              >
                {initials(name)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold" style={{ color: "#0a2e30" }}>{name}</p>
                  <p className="text-[11px] italic text-gray-400">DogCare Provider</p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={
                    p.active
                      ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                      : { background: "rgba(239,68,68,.1)",   color: "#dc2626" }
                  }
                >
                  {p.active ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="mt-0.5 flex items-center gap-1.5">
                <Stars value={Number(p.rating_avg)} />
                <span className="text-xs font-semibold text-gray-700">
                  {Number(p.rating_avg) > 0 ? Number(p.rating_avg).toFixed(1) : "New"}
                </span>
                {p.review_count > 0 && (
                  <span className="text-xs text-gray-400">({p.review_count} reviews)</span>
                )}
              </div>

              {p.neighbourhood && (
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-gray-400">
                  <span>📍 {p.neighbourhood}</span>
                  {p.distKm !== null && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(0,176,150,.12)", color: "#00b096" }}
                    >
                      {fmtDist(p.distKm)}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Service chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeSvcs.map(ps => {
              const st = ps.service_types;
              if (!st) return null;
              const highlighted = ps.service_type_id === highlightTypeId;
              return (
                <span
                  key={ps.service_type_id}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={
                    highlighted
                      ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                      : { background: "#f3f4f6", color: "#6b7280" }
                  }
                >
                  {st.emoji} {st.name}
                </span>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-4 mt-4">
            <div>
              {price !== null ? (
                <p className="text-sm">
                  <span className="font-bold" style={{ color: "#0a2e30" }}>
                    GHS {price.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400"> starting</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400">Price on request</p>
              )}
            </div>
            <span
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition group-hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              View Profile
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="h-1.5 animate-pulse" style={{ backgroundColor: "#e5e7eb" }} />
      <div className="p-5">
        <div className="flex gap-3">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div className="mt-4 flex items-center justify-between pt-4">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-24 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ── Main search UI ─────────────────────────────────────────────────────────

function SearchResults() {
  const params       = useSearchParams();
  const initSlug     = params.get("service") ?? "";
  const initLocation = params.get("location") ?? "";

  const [providers,     setProviders]     = useState<Provider[]>([]);
  const [serviceTypes,  setServiceTypes]  = useState<ServiceType[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [authUser,      setAuthUser]      = useState<{ name: string; isProvider: boolean } | null>(null);
  const [userCoords,    setUserCoords]    = useState<{ lat: number; lng: number } | null>(null);

  // Filters
  const [selectedSlug, setSelectedSlug] = useState(initSlug);
  const [location,     setLocation]     = useState(initLocation);
  const [priceIdx,     setPriceIdx]     = useState(0);
  const [avail,        setAvail]        = useState<"all" | "available">("available");

  useEffect(() => {
    async function checkAuth() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: u }] = await Promise.all([
        sb.from("providers").select("id").eq("user_id", user.id).maybeSingle(),
        sb.from("users").select("name, lat, lng").eq("id", user.id).single(),
      ]);
      const uRow = u as { name: string; lat: number | null; lng: number | null } | null;
      setAuthUser({ name: uRow?.name ?? "", isProvider: !!p });
      if (uRow?.lat != null && uRow?.lng != null) {
        setUserCoords({ lat: uRow.lat, lng: uRow.lng });
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const sb = createClient();

      const [{ data: stData }, { data: pvData }] = await Promise.all([
        sb.from("service_types").select("id, slug, name, emoji").order("name"),
        sb.from("providers")
          .select(`id, user_id, rating_avg, review_count, active, neighbourhood, avatar_url, lat, lng,
                   users!user_id(name),
                   provider_services(service_type_id, rate_small, rate_medium, rate_large, is_active, availability, service_types(slug, name, emoji))`)
          .order("rating_avg", { ascending: false }),
      ]);

      if (!cancelled) {
        setServiceTypes((stData ?? []) as ServiceType[]);
        setProviders((pvData ?? []) as unknown as Provider[]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const selectedTypeId = useMemo(
    () => serviceTypes.find(st => st.slug === selectedSlug)?.id ?? "",
    [serviceTypes, selectedSlug]
  );

  const visible = useMemo((): RankedProvider[] => {
    const range     = PRICE_RANGES[priceIdx];
    const locQuery  = location.trim();
    const refCoords = locQuery ? (lookupCoords(locQuery) ?? null) : userCoords;

    return providers
      .map(p => ({
        ...p,
        distKm:
          refCoords && p.lat != null && p.lng != null
            ? haversine(refCoords.lat, refCoords.lng, p.lat, p.lng)
            : null,
      }))
      .filter(p => {
        if (avail === "available" && !p.active) return false;

        const activeSvcs = (p.provider_services ?? []).filter(ps => ps.is_active);

        if (avail === "available" && activeSvcs.length > 0 && !isAvailableToday(activeSvcs)) return false;

        if (selectedTypeId && !activeSvcs.some(ps => ps.service_type_id === selectedTypeId)) return false;

        const price = minServicePrice(activeSvcs);
        if (price !== null && range.max < Infinity && price > range.max) return false;
        if (price !== null && price < range.min) return false;
        return true;
      })
      .sort((a, b) =>
        rankScore(b.distKm, Number(b.rating_avg), b.review_count) -
        rankScore(a.distKm, Number(a.rating_avg), a.review_count)
      );
  }, [providers, selectedTypeId, priceIdx, avail, location, userCoords]);

  const selectedST  = serviceTypes.find(st => st.slug === selectedSlug);
  const heading = [
    selectedST ? `${selectedST.emoji} ${selectedST.name}` : "All services",
    location.trim() ? `near ${location.trim()}` : "",
  ].filter(Boolean).join(" ");

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
        <div className="flex gap-2">
          {authUser ? (
            <Link
              href={authUser.isProvider ? "/dashboard/provider" : "/dashboard/owner"}
              className="rounded-full px-4 py-1.5 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
            >
              My Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/register/owner"
                className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="rounded-full px-4 py-1.5 text-sm font-semibold transition hover:opacity-90"
                style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
              >
                Log In
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero band ── */}
      <div className="relative overflow-hidden px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
          <svg style={{position:"absolute",width:110,top:"-12px",right:"6%",opacity:0.055,color:"#00b096",transform:"rotate(18deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:78,bottom:"-8px",left:"3%",opacity:0.05,color:"white",transform:"rotate(-14deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:54,top:"6px",left:"36%",opacity:0.04,color:"#00b096",transform:"rotate(28deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:82,top:"15%",right:"22%",opacity:0.035,color:"white",transform:"rotate(-6deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
          Search results
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">{heading}</h1>
        <p className="mt-1 text-sm text-white/50">
          {loading
            ? "Searching…"
            : `${visible.length} provider${visible.length !== 1 ? "s" : ""} found${(location.trim() || userCoords) ? " · sorted by proximity & rating" : " · sorted by rating"}`}
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">

        {/* ── Filter bar ── */}
        <div className="mb-6 flex flex-wrap gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">

          {/* Location */}
          <div className="min-w-[180px] flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Neighbourhood</p>
            <input
              type="text"
              list="search-accra-areas"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Any area"
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400"
            />
            <datalist id="search-accra-areas">
              {["Achimota","Adenta","Airport Residential","Cantonments","Dansoman","Dome","Dzorwulu","East Legon","Haatso","Kasoa","Kotobabi","Labone","Lapaz","Legon","Madina","Nima","North Kaneshie","Osu","Roman Ridge","Sakumono","Spintex","Tema","Tesano","Teshie","Trasacco Valley"].map(a => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          {/* Service */}
          <div className="min-w-[180px] flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Service</p>
            <select
              value={selectedSlug}
              onChange={e => setSelectedSlug(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
            >
              <option value="">All services</option>
              {serviceTypes.map(st => (
                <option key={st.id} value={st.slug}>
                  {st.emoji} {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price range */}
          <div className="min-w-[180px] flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Price range</p>
            <select
              value={priceIdx}
              onChange={e => setPriceIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
            >
              {PRICE_RANGES.map((r, i) => (
                <option key={i} value={i}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Availability toggle */}
          <div className="min-w-[180px] flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Availability</p>
            <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-sm">
              {(["all", "available"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setAvail(v)}
                  className="flex-1 py-2.5 text-xs font-semibold capitalize transition"
                  style={
                    avail === v
                      ? { backgroundColor: "#00b096", color: "#fff" }
                      : { color: "#9ca3af" }
                  }
                >
                  {v === "all" ? "All" : "Available today"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
            <img
              src="/puppies.png"
              alt=""
              className="mb-4 h-36 w-auto"
              style={{ filter: "drop-shadow(0 4px 16px rgba(0,176,150,0.15))" }}
            />
            <h2 className="mb-2 text-xl font-extrabold" style={{ color: "#0a2e30" }}>
              No providers found
            </h2>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-500">
              We couldn&apos;t find any providers matching your current filters.
              Try a different service type or adjust the price range — new
              providers join DogCareGH every week.
            </p>
            <Link
              href="/"
              className="rounded-full px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              Back to home
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(p => (
              <ProviderCard key={p.id} p={p} highlightTypeId={selectedTypeId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page export (Suspense required for useSearchParams) ────────────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen flex-col items-center justify-center"
          style={{ backgroundColor: "#0a2e30" }}
        >
          <p className="text-2xl font-bold text-white">
            Dog<span style={{ color: "#00b096" }}>Care</span>GH
          </p>
          <p className="mt-3 animate-pulse text-sm text-white/50">Loading providers…</p>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
