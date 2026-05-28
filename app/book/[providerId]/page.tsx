"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

type AvailSlot = { available: boolean; start?: string; end?: string };

type ProviderService = {
  id: string;
  service_type_id: string;
  rate_small: number | null;
  rate_medium: number | null;
  rate_large: number | null;
  is_active: boolean;
  availability: Record<string, AvailSlot> | null;
  service_types: { slug: string; name: string; emoji: string; unit_label: string } | null;
};

type ProviderInfo = {
  id: string;
  user_id: string;
  rating_avg: number;
  neighbourhood: string | null;
  avatar_url: string | null;
  active: boolean;
  users: { name: string } | { name: string }[] | null;
};

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

const MULTI_DAY_SLUGS = new Set(["dog_daycare", "dog_boarding"]);

const DAYS = [
  { id: "monday",    short: "Mon" },
  { id: "tuesday",   short: "Tue" },
  { id: "wednesday", short: "Wed" },
  { id: "thursday",  short: "Thu" },
  { id: "friday",    short: "Fri" },
  { id: "saturday",  short: "Sat" },
  { id: "sunday",    short: "Sun" },
];

const COMMISSION_RATE = 0.10;

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];

// ── Helpers ────────────────────────────────────────────────────────────────

const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function resolveUser(u: ProviderInfo["users"]): { name: string } | null {
  if (!u) return null;
  return Array.isArray(u) ? u[0] ?? null : u;
}

function daysBetween(start: string, end: string) {
  const diff = Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  return Math.max(diff, 1);
}

function rateForDog(svc: ProviderService, dogSize: string | null): number | null {
  const s = (dogSize ?? "").toLowerCase();
  if (s.includes("small"))  return svc.rate_small;
  if (s.includes("medium")) return svc.rate_medium;
  if (s.includes("large"))  return svc.rate_large;
  // fallback: return smallest available rate
  return svc.rate_small ?? svc.rate_medium ?? svc.rate_large ?? null;
}

function svcAvailDays(svc: ProviderService): string[] {
  const a = svc.availability;
  if (!a || Object.keys(a).length === 0) return [];
  return DAYS.filter(d => a[d.id]?.available).map(d => d.short);
}

const today = new Date().toISOString().split("T")[0];

// ── Page ───────────────────────────────────────────────────────────────────

export default function BookPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const router = useRouter();

  const [provider, setProvider]     = useState<ProviderInfo | null>(null);
  const [services, setServices]     = useState<ProviderService[]>([]);
  const [dogs, setDogs]             = useState<Dog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Form fields
  const [selectedSvcId, setSelectedSvcId] = useState("");
  const [startDate, setStartDate]         = useState("");
  const [endDate, setEndDate]             = useState("");
  const [dogId, setDogId]                 = useState("");
  const [notes, setNotes]                 = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace(`/login?redirect=/book/${providerId}`); return; }

      const [{ data: p }, { data: svcs }, { data: d }] = await Promise.all([
        sb.from("providers")
          .select("id, user_id, rating_avg, neighbourhood, avatar_url, active, users!user_id(name)")
          .eq("id", providerId)
          .single(),
        sb.from("provider_services")
          .select("id, service_type_id, rate_small, rate_medium, rate_large, is_active, availability, service_types(slug, name, emoji, unit_label)")
          .eq("provider_id", providerId)
          .eq("is_active", true),
        sb.from("dogs")
          .select("id, name, breed, size")
          .eq("owner_id", user.id)
          .order("created_at"),
      ]);

      if (cancelled) return;
      if (!p) { router.replace("/search"); return; }

      const activeSvcs = (svcs ?? []) as unknown as ProviderService[];
      if (activeSvcs.length === 1) setSelectedSvcId(activeSvcs[0].id);

      setProvider(p as unknown as ProviderInfo);
      setServices(activeSvcs);
      setDogs((d ?? []) as Dog[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [providerId, router]);

  // Derived values
  const selectedSvc  = services.find(s => s.id === selectedSvcId) ?? null;
  const selectedDog  = dogs.find(d => d.id === dogId) ?? null;
  const slug         = selectedSvc?.service_types?.slug ?? "";
  const multiDay     = MULTI_DAY_SLUGS.has(slug);
  const rate         = selectedSvc ? rateForDog(selectedSvc, selectedDog?.size ?? null) : null;
  const days         = multiDay && startDate && endDate ? daysBetween(startDate, endDate) : 1;
  const gross        = rate !== null ? rate * days : null;
  const commission   = gross !== null ? Math.round(gross * COMMISSION_RATE * 100) / 100 : null;
  const availDays    = selectedSvc ? svcAvailDays(selectedSvc) : [];

  const canSubmit = !!selectedSvcId && !!startDate && (!multiDay || !!endDate) && !!dogId && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !provider || !selectedSvc) return;
    setSubmitting(true);
    setError(null);

    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const effectiveEnd    = multiDay ? endDate : startDate;
    const effectiveGross  = gross ?? 0;
    const effectiveComm   = commission ?? 0;
    const effectivePayout = Math.round((effectiveGross - effectiveComm) * 100) / 100;

    const { data: booking, error: bookingErr } = await sb
      .from("bookings")
      .insert({
        owner_id:          user.id,
        provider_id:       provider.id,
        dog_id:            dogId,
        service_type:      selectedSvc.service_types?.slug ?? "",
        start_date:        startDate,
        end_date:          effectiveEnd,
        status:            "pending",
        gross_amount:      effectiveGross,
        commission_amount: effectiveComm,
        provider_payout:   effectivePayout,
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      setError(bookingErr?.message ?? "Failed to create booking. Please try again.");
      setSubmitting(false);
      return;
    }

    if (notes.trim()) {
      await sb.from("messages").insert({
        booking_id: booking.id,
        sender_id:  user.id,
        content:    notes.trim(),
      });
    }

    router.push(`/booking/${booking.id}`);
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <p className="text-2xl font-bold text-white">Dog<span style={{ color: "#00b096" }}>Care</span>GH</p>
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  if (!provider) return null;

  const pUser = resolveUser(provider.users);
  const name  = pUser?.name ?? "DogCare Provider";

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
        <Link
          href={`/provider/${providerId}`}
          className="text-sm text-white/60 transition hover:text-white"
        >
          ← Back to profile
        </Link>
      </nav>

      {/* ── Hero band ── */}
      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
          Booking request
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">Book a Service</h1>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">

        {/* ── Provider mini-card ── */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {provider.avatar_url ? (
            <img src={provider.avatar_url} alt={name} className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white"
              style={{ backgroundColor: avatarBg(provider.user_id) }}
            >
              {ini(name)}
            </div>
          )}
          <div className="flex-1">
            <p className="font-bold" style={{ color: "#0a2e30" }}>{name}</p>
            {provider.neighbourhood && (
              <p className="text-xs text-gray-400">📍 {provider.neighbourhood}</p>
            )}
            <div className="mt-0.5 flex items-center gap-2">
              <span style={{ color: "#f59e0b" }}>★</span>
              <span className="text-xs font-semibold text-gray-700">
                {Number(provider.rating_avg) > 0
                  ? Number(provider.rating_avg).toFixed(1)
                  : "New"}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={
                  provider.active
                    ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                    : { background: "rgba(239,68,68,.1)",  color: "#dc2626" }
                }
              >
                {provider.active ? "Available" : "Unavailable"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Unavailability warning ── */}
        {!provider.active && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This provider is currently not accepting bookings. You can still send a request and they may respond when they reopen.
          </div>
        )}

        {/* ── No services warning ── */}
        {services.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-2xl mb-2">🐾</p>
            <p className="font-semibold text-gray-700">No services available</p>
            <p className="mt-1 text-sm text-gray-400">This provider hasn&apos;t set up any services yet.</p>
            <Link
              href="/search"
              className="mt-4 inline-block rounded-full px-5 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: "#00b096" }}
            >
              Find another provider
            </Link>
          </div>
        )}

        {services.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Service selector ── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-bold" style={{ color: "#0a2e30" }}>Select Service</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map(svc => {
                  const st       = svc.service_types;
                  if (!st) return null;
                  const r        = rateForDog(svc, selectedDog?.size ?? null);
                  const selected = svc.id === selectedSvcId;
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => { setSelectedSvcId(svc.id); setEndDate(""); }}
                      className="flex items-center gap-3 rounded-xl border p-3.5 text-left transition"
                      style={
                        selected
                          ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.06)" }
                          : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }
                      }
                    >
                      <span className="text-2xl">{st.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{st.name}</p>
                        <p className="text-xs text-gray-400">{st.unit_label}</p>
                      </div>
                      {r !== null ? (
                        <span className="shrink-0 text-sm font-extrabold" style={{ color: "#00b096" }}>
                          GHS {r}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-gray-400">
                          {selectedDog ? "On request" : "Select dog for price"}
                        </span>
                      )}
                      {selected && (
                        <span className="ml-1 shrink-0 text-xs font-bold" style={{ color: "#00b096" }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Dog selector ── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-bold" style={{ color: "#0a2e30" }}>Select Dog</p>
              {dogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-8 text-center">
                  <span className="mb-2 text-3xl">🐶</span>
                  <p className="text-sm font-medium text-gray-600">No dogs registered yet</p>
                  <p className="mt-1 mb-3 text-xs text-gray-400">
                    Add a dog to your profile to continue
                  </p>
                  <Link
                    href="/dashboard/owner"
                    className="rounded-full px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: "#00b096" }}
                  >
                    Add a dog
                  </Link>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {dogs.map(dog => (
                    <button
                      key={dog.id}
                      type="button"
                      onClick={() => setDogId(dog.id)}
                      className="flex items-center gap-3 rounded-xl border p-3.5 text-left transition"
                      style={
                        dogId === dog.id
                          ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.06)" }
                          : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }
                      }
                    >
                      <span className="text-2xl">🐕</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: "#0a2e30" }}>
                          {dog.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {[dog.breed, dog.size].filter(Boolean).join(" · ") || "No details"}
                        </p>
                      </div>
                      {dogId === dog.id && (
                        <span className="shrink-0 text-xs font-bold" style={{ color: "#00b096" }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedDog?.size && selectedSvc && rate !== null && (
                <p className="mt-2.5 text-xs text-gray-500">
                  Rate for <span className="font-semibold">{selectedDog.size}</span> dog:{" "}
                  <span className="font-bold" style={{ color: "#00b096" }}>GHS {rate}</span>
                  {" "}{selectedSvc.service_types?.unit_label}
                </p>
              )}
            </div>

            {/* ── Date picker(s) ── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-sm font-bold" style={{ color: "#0a2e30" }}>
                {multiDay ? "Select Dates" : "Select Date"}
              </p>
              {availDays.length > 0 && (
                <p className="mb-3 text-xs text-gray-500">
                  Available on:{" "}
                  <span className="font-semibold" style={{ color: "#00b096" }}>
                    {availDays.join(", ")}
                  </span>
                </p>
              )}
              {!selectedSvc && (
                <p className="mb-3 text-xs text-gray-400">Select a service to see available days.</p>
              )}
              <div className={`grid gap-4 ${multiDay ? "sm:grid-cols-2" : ""}`}>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    {multiDay ? "Start date" : "Date"}
                  </label>
                  <input
                    type="date"
                    required
                    min={today}
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
                  />
                </div>
                {multiDay && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">End date</label>
                    <input
                      type="date"
                      required
                      min={startDate || today}
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-bold" style={{ color: "#0a2e30" }}>
                Notes{" "}
                <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Special requirements, your dog's routine, allergies, feeding schedule…"
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
              />
            </div>

            {/* ── Price summary ── */}
            {gross !== null && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold" style={{ color: "#0a2e30" }}>Price Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      GHS {rate} {selectedSvc?.service_types?.unit_label}
                      {multiDay && days > 1 && (
                        <span className="text-gray-400"> × {days} days</span>
                      )}
                    </span>
                    <span>GHS {gross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Platform fee (10%)</span>
                    <span>GHS {commission?.toFixed(2)}</span>
                  </div>
                  <div
                    className="flex justify-between border-t border-gray-100 pt-2 text-base font-extrabold"
                    style={{ color: "#0a2e30" }}
                  >
                    <span>Total</span>
                    <span>GHS {gross.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: "#00b096" }}
            >
              {submitting ? "Sending request…" : "Request Booking"}
            </button>

            <p className="text-center text-xs text-gray-400">
              No payment required now — the provider has 24 hours to accept your request.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
