"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ACCRA_AREAS } from "@/lib/geocode";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug =
  | "dog_walking"
  | "dog_sitting"
  | "dog_daycare"
  | "dog_boarding"
  | "dog_grooming";

type ServiceConfig = {
  dbId?: string;
  enabled: boolean;
  rateSmall: string;
  rateMedium: string;
  rateLarge: string;
  rateHalfSmall: string;   // sitting half-day (6 hrs)
  rateHalfMedium: string;
  rateHalfLarge: string;
  maxCapacity: string;
  description: string;
  groomingMode: "simple" | "itemised";
  availability: Partial<Record<DayId, AvailSlot>>;
};

type SubRates = { rateSmall: string; rateMedium: string; rateLarge: string };

type Addon = {
  localId: string;
  name: string;
  description: string;
  price: string;
};

type DiscountTier = {
  localId: string;
  serviceSlug: ServiceSlug;
  discountType: "duration" | "bulk";
  threshold: string;
  percentage: string;
};

type DayId =
  | "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";

type AvailSlot = { available: boolean; start: string; end: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES: {
  slug: ServiceSlug;
  emoji: string;
  label: string;
  unit: string;
}[] = [
  { slug: "dog_walking",  emoji: "🦮", label: "Dog Walking",  unit: "per hour"    },
  { slug: "dog_sitting",  emoji: "🐾", label: "Dog Sitting",  unit: "half / full day" },
  { slug: "dog_daycare",  emoji: "🏡", label: "Dog Daycare",  unit: "per 12 hrs"  },
  { slug: "dog_boarding", emoji: "🛏️", label: "Dog Overnight", unit: "per night"  },
  { slug: "dog_grooming", emoji: "✂️", label: "Dog Grooming", unit: "per session" },
];

// Services that require Level 2 verification (home-based services)
const LEVEL_2_SLUGS = new Set<ServiceSlug>(["dog_sitting", "dog_daycare", "dog_boarding"]);

const GROOMING_SUBS = [
  { slug: "bath_brush",     label: "Bath & Brush"    },
  { slug: "full_groom",     label: "Full Groom"       },
  { slug: "nail_trim",      label: "Nail Trim"        },
  { slug: "ear_cleaning",   label: "Ear Cleaning"     },
  { slug: "teeth_cleaning", label: "Teeth Cleaning"   },
  { slug: "deshedding",     label: "De-shedding"      },
  { slug: "paw_care",       label: "Paw Care"         },
  { slug: "flea_treatment", label: "Flea Treatment"   },
] as const;

type GroomingSlug = typeof GROOMING_SUBS[number]["slug"];

const DAYS: { id: DayId; short: string }[] = [
  { id: "monday",    short: "Mon" },
  { id: "tuesday",   short: "Tue" },
  { id: "wednesday", short: "Wed" },
  { id: "thursday",  short: "Thu" },
  { id: "friday",    short: "Fri" },
  { id: "saturday",  short: "Sat" },
  { id: "sunday",    short: "Sun" },
];

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:bg-white focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";

function uid() { return Math.random().toString(36).slice(2); }

const DEFAULT_CONFIG: ServiceConfig = {
  enabled: false,
  rateSmall: "",
  rateMedium: "",
  rateLarge: "",
  rateHalfSmall: "",
  rateHalfMedium: "",
  rateHalfLarge: "",
  maxCapacity: "",
  description: "",
  groomingMode: "simple",
  availability: {},
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-extrabold" style={{ color: "#0a2e30" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Rate inputs (Small / Medium / Large) ─────────────────────────────────────

function RateInputs({
  rateSmall,
  rateMedium,
  rateLarge,
  onChange,
  rateLabel = "Rate by Dog Size (GH₵)",
}: {
  rateSmall: string;
  rateMedium: string;
  rateLarge: string;
  onChange: (key: "rateSmall" | "rateMedium" | "rateLarge", val: string) => void;
  rateLabel?: string;
}) {
  return (
    <div>
      <label className={LABEL}>{rateLabel}</label>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { label: "Small (<10kg)",    key: "rateSmall"  },
            { label: "Medium (10–25kg)", key: "rateMedium" },
            { label: "Large (>25kg)",    key: "rateLarge"  },
          ] as const
        ).map(({ label, key }) => (
          <div key={key}>
            <p className="mb-1 text-[11px] text-gray-400">{label}</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                GH₵
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={key === "rateSmall" ? rateSmall : key === "rateMedium" ? rateMedium : rateLarge}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Availability editor (per service) ───────────────────────────────────────

function AvailabilityEditor({
  availability,
  onChange,
}: {
  availability: Partial<Record<DayId, AvailSlot>>;
  onChange: (avail: Partial<Record<DayId, AvailSlot>>) => void;
}) {
  return (
    <div>
      <label className={LABEL}>Weekly Availability</label>
      <div className="space-y-2">
        {DAYS.map(({ id, short }) => {
          const slot = availability[id];
          const on = slot?.available === true;
          return (
            <div
              key={id}
              className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition"
              style={on
                ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.04)" }
                : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}
            >
              <button
                type="button"
                onClick={() => onChange({
                  ...availability,
                  [id]: { available: !on, start: slot?.start ?? "08:00", end: slot?.end ?? "18:00" },
                })}
                className="flex items-center gap-2.5"
                style={{ minWidth: 68 }}
              >
                <div
                  className="relative h-5 w-9 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: on ? "#00b096" : "#d1d5db" }}
                >
                  <div
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: on ? "translateX(16px)" : "translateX(2px)" }}
                  />
                </div>
                <span className="text-sm font-semibold" style={{ color: on ? "#0a2e30" : "#9ca3af" }}>
                  {short}
                </span>
              </button>

              {on && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-400">From</span>
                  <input
                    type="time"
                    value={slot?.start ?? "08:00"}
                    onChange={e => onChange({
                      ...availability,
                      [id]: { available: true, start: e.target.value, end: slot?.end ?? "18:00" },
                    })}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-[#00b096]"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="time"
                    value={slot?.end ?? "18:00"}
                    onChange={e => onChange({
                      ...availability,
                      [id]: { available: true, start: slot?.start ?? "08:00", end: e.target.value },
                    })}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-[#00b096]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderServicesPage() {
  const router = useRouter();

  const [providerId,     setProviderId]     = useState("");
  const [serviceTypeIds, setServiceTypeIds] = useState<Record<string, string>>({});

  const [configs, setConfigs] = useState<Record<ServiceSlug, ServiceConfig>>(
    Object.fromEntries(SERVICES.map((s) => [s.slug, { ...DEFAULT_CONFIG }])) as Record<
      ServiceSlug,
      ServiceConfig
    >
  );

  const [subServices,    setSubServices]    = useState<Partial<Record<GroomingSlug, SubRates>>>({});
  const [addons,         setAddons]         = useState<Addon[]>([]);
  const [discountTiers,  setDiscountTiers]  = useState<DiscountTier[]>([]);
  const [serviceAreas,   setServiceAreas]   = useState<string[]>([]);

  const [providerLevel, setProviderLevel] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        router.replace("/login?redirect=/dashboard/provider/services");
        return;
      }

      const [provRes, stRes] = await Promise.all([
        fetch("/api/dashboard/provider"),
        sb.from("service_types").select("id, slug"),
      ]);

      if (!provRes.ok) {
        router.replace("/register/provider");
        return;
      }
      const { provider: pData } = await provRes.json();
      if (!pData) {
        router.replace("/register/provider");
        return;
      }

      const pid = (pData as { id: string; provider_level?: number }).id;
      setProviderId(pid);
      setProviderLevel((pData as { provider_level?: number }).provider_level ?? 1);

      const stMap: Record<string, string> = {};
      for (const st of stRes.data ?? []) stMap[st.slug] = st.id;
      setServiceTypeIds(stMap);

      // Reverse map: service_type uuid → slug
      const slugById: Record<string, ServiceSlug> = {};
      for (const [slug, id] of Object.entries(stMap))
        slugById[id] = slug as ServiceSlug;

      const [psRes, addonRes, discountRes, areaRes] = await Promise.all([
        sb
          .from("provider_services")
          .select(
            "id, service_type_id, rate_small, rate_medium, rate_large, rate_half_small, rate_half_medium, rate_half_large, max_capacity, description, grooming_mode, is_active, availability"
          )
          .eq("provider_id", pid),
        sb
          .from("provider_addons")
          .select("id, name, description, price")
          .eq("provider_id", pid)
          .eq("is_active", true),
        sb
          .from("provider_discount_tiers")
          .select("id, service_type_id, discount_type, threshold, percentage")
          .eq("provider_id", pid),
        sb
          .from("provider_service_areas")
          .select("neighbourhood")
          .eq("provider_id", pid),
      ]);

      // Build configs from existing rows
      const newConfigs: Record<ServiceSlug, ServiceConfig> = Object.fromEntries(
        SERVICES.map((s) => [s.slug, { ...DEFAULT_CONFIG }])
      ) as Record<ServiceSlug, ServiceConfig>;

      let groomingServiceId: string | undefined;

      for (const ps of psRes.data ?? []) {
        const slug = slugById[ps.service_type_id];
        if (!slug) continue;
        newConfigs[slug] = {
          dbId:           ps.id,
          enabled:        ps.is_active,
          rateSmall:      ps.rate_small       != null ? String(ps.rate_small)       : "",
          rateMedium:     ps.rate_medium      != null ? String(ps.rate_medium)      : "",
          rateLarge:      ps.rate_large       != null ? String(ps.rate_large)       : "",
          rateHalfSmall:  ps.rate_half_small  != null ? String(ps.rate_half_small)  : "",
          rateHalfMedium: ps.rate_half_medium != null ? String(ps.rate_half_medium) : "",
          rateHalfLarge:  ps.rate_half_large  != null ? String(ps.rate_half_large)  : "",
          maxCapacity:    ps.max_capacity     != null ? String(ps.max_capacity)     : "",
          description:    ps.description ?? "",
          groomingMode:   (ps.grooming_mode as "simple" | "itemised") ?? "simple",
          availability:   (ps.availability ?? {}) as Partial<Record<DayId, AvailSlot>>,
        };
        if (slug === "dog_grooming") groomingServiceId = ps.id;
      }
      setConfigs(newConfigs);

      // Grooming sub-services
      if (groomingServiceId) {
        const { data: ssData } = await sb
          .from("grooming_sub_services")
          .select("id, name, rate_small, rate_medium, rate_large")
          .eq("provider_service_id", groomingServiceId)
          .eq("is_active", true);

        const subMap: Partial<Record<GroomingSlug, SubRates>> = {};
        for (const ss of ssData ?? []) {
          const found = GROOMING_SUBS.find(g => g.label === ss.name || g.slug === ss.name);
          if (found) {
            subMap[found.slug] = {
              rateSmall:  ss.rate_small  != null ? String(ss.rate_small)  : "",
              rateMedium: ss.rate_medium != null ? String(ss.rate_medium) : "",
              rateLarge:  ss.rate_large  != null ? String(ss.rate_large)  : "",
            };
          }
        }
        setSubServices(subMap);
      }

      setAddons(
        (addonRes.data ?? []).map((a) => ({
          localId:     a.id,
          name:        a.name,
          description: a.description ?? "",
          price:       String(a.price),
        }))
      );

      setDiscountTiers(
        (discountRes.data ?? []).map((dt) => ({
          localId:      uid(),
          serviceSlug:  slugById[dt.service_type_id],
          discountType: dt.discount_type as "duration" | "bulk",
          threshold:    String(dt.threshold),
          percentage:   String(dt.percentage),
        }))
      );

      setServiceAreas((areaRes.data ?? []).map((a) => a.neighbourhood));
      setLoading(false);
    }
    load();
  }, [router]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function updateConfig(slug: ServiceSlug, patch: Partial<ServiceConfig>) {
    setConfigs((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));
  }

  function toggleSubService(slug: GroomingSlug) {
    setSubServices(prev => {
      if (prev[slug]) {
        const next = { ...prev };
        delete next[slug];
        return next;
      }
      return { ...prev, [slug]: { rateSmall: "", rateMedium: "", rateLarge: "" } };
    });
  }

  function updateSubRate(slug: GroomingSlug, key: keyof SubRates, val: string) {
    setSubServices(prev => ({ ...prev, [slug]: { ...prev[slug]!, [key]: val } }));
  }

  function addAddon() {
    setAddons((prev) => [
      ...prev,
      { localId: uid(), name: "", description: "", price: "" },
    ]);
  }

  function updateAddon(localId: string, patch: Partial<Addon>) {
    setAddons((prev) =>
      prev.map((a) => (a.localId === localId ? { ...a, ...patch } : a))
    );
  }

  function removeAddon(localId: string) {
    setAddons((prev) => prev.filter((a) => a.localId !== localId));
  }

  function addDiscountTier(serviceSlug: ServiceSlug, discountType: "duration" | "bulk") {
    setDiscountTiers((prev) => [
      ...prev,
      { localId: uid(), serviceSlug, discountType, threshold: "", percentage: "" },
    ]);
  }

  function updateDiscountTier(localId: string, patch: Partial<DiscountTier>) {
    setDiscountTiers((prev) =>
      prev.map((dt) => (dt.localId === localId ? { ...dt, ...patch } : dt))
    );
  }

  function removeDiscountTier(localId: string) {
    setDiscountTiers((prev) => prev.filter((dt) => dt.localId !== localId));
  }

  function toggleArea(neighbourhood: string) {
    setServiceAreas((prev) =>
      prev.includes(neighbourhood)
        ? prev.filter((a) => a !== neighbourhood)
        : [...prev, neighbourhood]
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const enabledServices = SERVICES.filter((s) => configs[s.slug].enabled);
    if (enabledServices.length === 0) {
      setError("Please enable at least one service.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const sb = createClient();
      let groomingServiceId: string | undefined = configs.dog_grooming.dbId;

      // 1. Upsert / delete provider_services
      for (const svc of SERVICES) {
        const cfg  = configs[svc.slug];
        const stId = serviceTypeIds[svc.slug];
        if (!stId) continue;

        if (cfg.enabled) {
          const isGrooming    = svc.slug === "dog_grooming";
          const itemised      = isGrooming && cfg.groomingMode === "itemised";

          const { data, error: uErr } = await sb
            .from("provider_services")
            .upsert(
              {
                ...(cfg.dbId ? { id: cfg.dbId } : {}),
                provider_id:     providerId,
                service_type_id: stId,
                rate_small:       itemised || !cfg.rateSmall       ? null : Number(cfg.rateSmall),
                rate_medium:      itemised || !cfg.rateMedium     ? null : Number(cfg.rateMedium),
                rate_large:       itemised || !cfg.rateLarge      ? null : Number(cfg.rateLarge),
                rate_half_small:  svc.slug !== "dog_sitting" || !cfg.rateHalfSmall  ? null : Number(cfg.rateHalfSmall),
                rate_half_medium: svc.slug !== "dog_sitting" || !cfg.rateHalfMedium ? null : Number(cfg.rateHalfMedium),
                rate_half_large:  svc.slug !== "dog_sitting" || !cfg.rateHalfLarge  ? null : Number(cfg.rateHalfLarge),
                max_capacity:    cfg.maxCapacity ? Number(cfg.maxCapacity) : null,
                description:     cfg.description.trim() || null,
                grooming_mode:   isGrooming ? cfg.groomingMode : null,
                availability:    cfg.availability ?? {},
                is_active:       true,
                updated_at:      new Date().toISOString(),
              },
              { onConflict: "provider_id,service_type_id" }
            )
            .select("id")
            .single();

          if (uErr) throw uErr;

          if (data?.id) {
            updateConfig(svc.slug, { dbId: data.id });
            if (svc.slug === "dog_grooming") groomingServiceId = data.id;
          }
        } else if (cfg.dbId) {
          await sb.from("provider_services").delete().eq("id", cfg.dbId);
          updateConfig(svc.slug, { dbId: undefined });
          if (svc.slug === "dog_grooming") groomingServiceId = undefined;
        }
      }

      // 2. Grooming sub-services
      if (configs.dog_grooming.enabled && groomingServiceId) {
        await sb
          .from("grooming_sub_services")
          .delete()
          .eq("provider_service_id", groomingServiceId);

        const selectedSubs = GROOMING_SUBS.filter(g => subServices[g.slug]);
        if (selectedSubs.length > 0) {
          const { error: ssErr } = await sb.from("grooming_sub_services").insert(
            selectedSubs.map(g => {
              const rates = subServices[g.slug]!;
              return {
                provider_service_id: groomingServiceId,
                name:        g.label,
                rate_small:  rates.rateSmall  ? Number(rates.rateSmall)  : null,
                rate_medium: rates.rateMedium ? Number(rates.rateMedium) : null,
                rate_large:  rates.rateLarge  ? Number(rates.rateLarge)  : null,
                is_active:   true,
              };
            })
          );
          if (ssErr) throw ssErr;
        }
      }

      // 3. Add-ons (delete all, re-insert)
      await sb.from("provider_addons").delete().eq("provider_id", providerId);
      const validAddons = addons.filter((a) => a.name.trim() && a.price);
      if (validAddons.length > 0) {
        const { error: addonErr } = await sb.from("provider_addons").insert(
          validAddons.map((a) => ({
            provider_id: providerId,
            name:        a.name.trim(),
            description: a.description.trim() || null,
            price:       Number(a.price),
            is_active:   true,
          }))
        );
        if (addonErr) throw addonErr;
      }

      // 4. Discount tiers (delete all, re-insert)
      await sb.from("provider_discount_tiers").delete().eq("provider_id", providerId);
      const validTiers = discountTiers.filter(
        (dt) =>
          serviceTypeIds[dt.serviceSlug] &&
          dt.threshold &&
          dt.percentage &&
          configs[dt.serviceSlug]?.enabled
      );
      if (validTiers.length > 0) {
        const { error: tierErr } = await sb.from("provider_discount_tiers").insert(
          validTiers.map((dt) => ({
            provider_id:     providerId,
            service_type_id: serviceTypeIds[dt.serviceSlug],
            discount_type:   dt.discountType,
            threshold:       Number(dt.threshold),
            percentage:      Number(dt.percentage),
          }))
        );
        if (tierErr) throw tierErr;
      }

      // 5. Service areas (delete all, re-insert)
      await sb.from("provider_service_areas").delete().eq("provider_id", providerId);
      if (serviceAreas.length > 0) {
        const { error: areaErr } = await sb.from("provider_service_areas").insert(
          serviceAreas.map((n) => ({ provider_id: providerId, neighbourhood: n }))
        );
        if (areaErr) throw areaErr;
      }

      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ?? "Failed to save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
        <p className="mt-3 animate-pulse text-sm text-white/50">
          Loading services…
        </p>
      </div>
    );
  }

  const enabledSlugs = SERVICES.filter((s) => configs[s.slug].enabled).map(
    (s) => s.slug
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <Link
          href="/dashboard/provider"
          className="text-xs font-medium text-white/60 transition hover:text-white"
        >
          ← Dashboard
        </Link>
      </nav>

      {/* ── Header band ── */}
      <div
        className="px-6 pb-8 pt-7 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#00b096" }}
        >
          Provider Settings
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">
          My Services
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Set up the services you offer, your rates by dog size, and any
          discounts or add-ons.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-32 md:px-8">

          {/* ── Error banner ── */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
              <span className="text-lg">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto text-red-300 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── 1. Services ── */}
          <Section
            title="Your Services"
            subtitle="Enable each service you offer and set your GH₵ rates by dog size (under 10 kg · 10–25 kg · over 25 kg)."
          >
            <div className="space-y-4">
              {SERVICES.map((svc) => {
                const cfg       = configs[svc.slug];
                const isGrooming = svc.slug === "dog_grooming";
                const itemised  = isGrooming && cfg.groomingMode === "itemised";
                const isLocked  = LEVEL_2_SLUGS.has(svc.slug) && providerLevel < 2;

                if (isLocked) {
                  return (
                    <div key={svc.slug} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-60">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{svc.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-500">{svc.label}</p>
                          <p className="text-xs text-gray-400">Requires Level 2 verification</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/provider/verify"
                        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                        style={{ backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }}
                      >
                        Apply for Level 2
                      </Link>
                    </div>
                  );
                }

                return (
                  <div
                    key={svc.slug}
                    className="overflow-hidden rounded-xl border transition"
                    style={
                      cfg.enabled
                        ? {
                            borderColor: "#00b096",
                            backgroundColor: "rgba(0,176,150,.04)",
                          }
                        : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }
                    }
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-4 p-4">
                      <button
                        type="button"
                        onClick={() =>
                          updateConfig(svc.slug, { enabled: !cfg.enabled })
                        }
                        className="flex items-center gap-3"
                      >
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold text-white transition"
                          style={
                            cfg.enabled
                              ? {
                                  backgroundColor: "#00b096",
                                  borderColor: "#00b096",
                                }
                              : { borderColor: "#d1d5db" }
                          }
                        >
                          {cfg.enabled ? "✓" : ""}
                        </span>
                        <span className="text-xl">{svc.emoji}</span>
                        <div>
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color: cfg.enabled ? "#0a2e30" : "#6b7280",
                            }}
                          >
                            {svc.label}
                          </p>
                          <p className="text-xs text-gray-400">{svc.unit}</p>
                        </div>
                      </button>
                    </div>

                    {/* Expanded content */}
                    {cfg.enabled && (
                      <div className="space-y-4 border-t border-[#00b096]/10 px-4 pb-5 pt-4">

                        {/* Grooming mode selector */}
                        {isGrooming && (
                          <div>
                            <label className={LABEL}>Pricing Mode</label>
                            <div className="flex gap-3">
                              {(["simple", "itemised"] as const).map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() =>
                                    updateConfig(svc.slug, {
                                      groomingMode: mode,
                                    })
                                  }
                                  className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
                                  style={
                                    cfg.groomingMode === mode
                                      ? {
                                          borderColor: "#00b096",
                                          backgroundColor:
                                            "rgba(0,176,150,.08)",
                                          color: "#0a2e30",
                                        }
                                      : {
                                          borderColor: "#e5e7eb",
                                          color: "#6b7280",
                                        }
                                  }
                                >
                                  {mode === "simple"
                                    ? "Simple (flat rates)"
                                    : "Itemised (by service)"}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sitting: two rate tiers */}
                        {svc.slug === "dog_sitting" ? (
                          <div className="space-y-4">
                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                              <p className="mb-3 text-xs font-bold" style={{ color: "#0a2e30" }}>
                                Half-day rate — 6 hours (GH₵)
                              </p>
                              <RateInputs
                                rateSmall={cfg.rateHalfSmall}
                                rateMedium={cfg.rateHalfMedium}
                                rateLarge={cfg.rateHalfLarge}
                                onChange={(key, val) => updateConfig(svc.slug, {
                                  rateHalfSmall:  key === "rateSmall"  ? val : cfg.rateHalfSmall,
                                  rateHalfMedium: key === "rateMedium" ? val : cfg.rateHalfMedium,
                                  rateHalfLarge:  key === "rateLarge"  ? val : cfg.rateHalfLarge,
                                })}
                                rateLabel=""
                              />
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                              <p className="mb-3 text-xs font-bold" style={{ color: "#0a2e30" }}>
                                Full-day rate — 12 hours (GH₵)
                              </p>
                              <RateInputs
                                rateSmall={cfg.rateSmall}
                                rateMedium={cfg.rateMedium}
                                rateLarge={cfg.rateLarge}
                                onChange={(key, val) => updateConfig(svc.slug, { [key]: val })}
                                rateLabel=""
                              />
                            </div>
                            <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                              💡 Owners choose half-day or full-day when booking. Set both rates and your available hours below.
                            </p>
                          </div>
                        ) : (
                          /* All other services: single rate input, hidden for itemised grooming */
                          <>
                            {!itemised && (
                              <RateInputs
                                rateSmall={cfg.rateSmall}
                                rateMedium={cfg.rateMedium}
                                rateLarge={cfg.rateLarge}
                                onChange={(key, val) => updateConfig(svc.slug, { [key]: val })}
                                rateLabel={
                                  svc.slug === "dog_walking"
                                    ? "Hourly Rate by Dog Size (GH₵)"
                                    : svc.slug === "dog_daycare"
                                    ? "Rate per 12 hrs by Dog Size (GH₵)"
                                    : "Rate by Dog Size (GH₵)"
                                }
                              />
                            )}
                            {svc.slug === "dog_walking" && (
                              <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                💡 Owners will see your available days and hours when booking, and can select a time range.
                              </p>
                            )}
                          </>
                        )}

                        {/* Capacity + description */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className={LABEL}>Max Dogs at Once</label>
                            <input
                              type="number"
                              min={1}
                              placeholder="e.g. 3"
                              value={cfg.maxCapacity}
                              onChange={(e) =>
                                updateConfig(svc.slug, {
                                  maxCapacity: e.target.value,
                                })
                              }
                              className={INPUT}
                            />
                          </div>
                          <div>
                            <label className={LABEL}>
                              Description{" "}
                              <span className="font-normal text-gray-400">
                                (optional)
                              </span>
                            </label>
                            <input
                              type="text"
                              placeholder="Anything owners should know…"
                              value={cfg.description}
                              onChange={(e) =>
                                updateConfig(svc.slug, {
                                  description: e.target.value,
                                })
                              }
                              className={INPUT}
                            />
                          </div>
                        </div>

                        {/* Availability */}
                        <AvailabilityEditor
                          availability={cfg.availability}
                          onChange={avail => updateConfig(svc.slug, { availability: avail })}
                        />

                        {/* Grooming sub-services (itemised) */}
                        {isGrooming && cfg.groomingMode === "itemised" && (
                          <div className="rounded-xl border border-dashed border-[#00b096]/30 bg-white p-4">
                            <label className="mb-3 block text-xs font-semibold text-gray-600">
                              Select grooming services you offer
                            </label>
                            <div className="space-y-2">
                              {GROOMING_SUBS.map(g => {
                                const rates = subServices[g.slug];
                                const on = !!rates;
                                return (
                                  <div
                                    key={g.slug}
                                    className="overflow-hidden rounded-xl border transition"
                                    style={on
                                      ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.03)" }
                                      : { borderColor: "#e5e7eb" }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleSubService(g.slug)}
                                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                                    >
                                      <span
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold text-white transition"
                                        style={on
                                          ? { backgroundColor: "#00b096", borderColor: "#00b096" }
                                          : { borderColor: "#d1d5db" }}
                                      >
                                        {on ? "✓" : ""}
                                      </span>
                                      <span className="text-sm font-semibold" style={{ color: on ? "#0a2e30" : "#6b7280" }}>
                                        {g.label}
                                      </span>
                                    </button>

                                    {on && (
                                      <div className="border-t border-[#00b096]/10 px-4 pb-3 pt-2">
                                        <div className="grid grid-cols-3 gap-2">
                                          {([
                                            { label: "Small",  key: "rateSmall"  },
                                            { label: "Medium", key: "rateMedium" },
                                            { label: "Large",  key: "rateLarge"  },
                                          ] as const).map(({ label, key }) => (
                                            <div key={key}>
                                              <p className="mb-1 text-[10px] text-gray-400">{label}</p>
                                              <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">GH₵</span>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  step="0.01"
                                                  placeholder="0.00"
                                                  value={rates[key]}
                                                  onChange={e => updateSubRate(g.slug, key, e.target.value)}
                                                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-2 text-xs font-semibold outline-none transition focus:border-[#00b096]"
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── 2. Add-ons ── */}
          <Section
            title="Add-ons"
            subtitle="Optional extras owners can add to any booking — e.g. medication administration, extra walks, special feeding."
          >
            {addons.length === 0 && (
              <p className="mb-4 text-sm text-gray-400">No add-ons added yet.</p>
            )}

            <div className="space-y-3">
              {addons.map((addon) => (
                <div
                  key={addon.localId}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={LABEL}>Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Medication administration"
                        value={addon.name}
                        onChange={(e) =>
                          updateAddon(addon.localId, { name: e.target.value })
                        }
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Price (GH₵)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          GH₵
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={addon.price}
                          onChange={(e) =>
                            updateAddon(addon.localId, { price: e.target.value })
                          }
                          className={INPUT + " pl-14"}
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL}>
                        Description{" "}
                        <span className="font-normal text-gray-400">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="Brief description of this add-on"
                        value={addon.description}
                        onChange={(e) =>
                          updateAddon(addon.localId, {
                            description: e.target.value,
                          })
                        }
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAddon(addon.localId)}
                    className="mt-3 text-xs text-gray-400 transition hover:text-red-500"
                  >
                    Remove add-on
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addAddon}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm font-semibold text-gray-400 transition hover:border-[#00b096] hover:text-[#00b096]"
            >
              + Add an add-on
            </button>
          </Section>

          {/* ── 3. Discounts ── */}
          <Section
            title="Discounts"
            subtitle="Offer automatic discounts for longer bookings (duration) or multiple dogs at once (bulk)."
          >
            {enabledSlugs.length === 0 ? (
              <p className="text-sm text-gray-400">
                Enable at least one service above to set up discounts.
              </p>
            ) : (
              <div className="space-y-4">
                {enabledSlugs.map((slug) => {
                  const svc   = SERVICES.find((s) => s.slug === slug)!;
                  const tiers = discountTiers.filter(
                    (dt) => dt.serviceSlug === slug
                  );

                  return (
                    <div
                      key={slug}
                      className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span>{svc.emoji}</span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "#0a2e30" }}
                        >
                          {svc.label}
                        </span>
                      </div>

                      {tiers.length === 0 && (
                        <p className="mb-3 text-xs italic text-gray-400">
                          No discounts for this service yet.
                        </p>
                      )}

                      <div className="space-y-2 mb-3">
                        {tiers.map((dt) => (
                          <div
                            key={dt.localId}
                            className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3"
                          >
                            <span
                              className="w-16 rounded-lg px-2 py-1 text-center text-[11px] font-semibold"
                              style={{
                                backgroundColor:
                                  dt.discountType === "duration"
                                    ? "rgba(0,176,150,.1)"
                                    : "rgba(99,102,241,.1)",
                                color:
                                  dt.discountType === "duration"
                                    ? "#00b096"
                                    : "#6366f1",
                              }}
                            >
                              {dt.discountType === "duration"
                                ? "Duration"
                                : "Bulk"}
                            </span>

                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <span className="text-xs text-gray-400">≥</span>
                              <input
                                type="number"
                                min={1}
                                placeholder="e.g. 7"
                                value={dt.threshold}
                                onChange={(e) =>
                                  updateDiscountTier(dt.localId, {
                                    threshold: e.target.value,
                                  })
                                }
                                className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm outline-none transition focus:border-[#00b096]"
                              />
                              <span className="text-xs text-gray-400">
                                {dt.discountType === "duration"
                                  ? slug === "dog_boarding"
                                    ? "nights"
                                    : "days"
                                  : "dogs"}
                              </span>
                              <span className="text-gray-300">→</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                step="0.5"
                                placeholder="10"
                                value={dt.percentage}
                                onChange={(e) =>
                                  updateDiscountTier(dt.localId, {
                                    percentage: e.target.value,
                                  })
                                }
                                className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm outline-none transition focus:border-[#00b096]"
                              />
                              <span className="text-xs text-gray-400">% off</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeDiscountTier(dt.localId)}
                              className="ml-auto text-gray-300 transition hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addDiscountTier(slug, "duration")}
                          className="rounded-lg border border-dashed border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-[#00b096] hover:text-[#00b096]"
                        >
                          + Duration discount
                        </button>
                        <button
                          type="button"
                          onClick={() => addDiscountTier(slug, "bulk")}
                          className="rounded-lg border border-dashed border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-[#00b096] hover:text-[#00b096]"
                        >
                          + Bulk (multi-dog) discount
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── 4. Service Areas ── */}
          <Section
            title="Service Areas"
            subtitle="Which Accra neighbourhoods do you serve? Owners use this to find providers near them."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACCRA_AREAS.map((area) => {
                const selected = serviceAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleArea(area)}
                    className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition"
                    style={
                      selected
                        ? {
                            borderColor: "#00b096",
                            backgroundColor: "rgba(0,176,150,.06)",
                            color: "#0a2e30",
                            fontWeight: 600,
                          }
                        : {
                            borderColor: "#e5e7eb",
                            backgroundColor: "#fafafa",
                            color: "#6b7280",
                          }
                    }
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] text-white transition"
                      style={
                        selected
                          ? {
                              backgroundColor: "#00b096",
                              borderColor: "#00b096",
                            }
                          : { borderColor: "#d1d5db" }
                      }
                    >
                      {selected ? "✓" : ""}
                    </span>
                    {area}
                  </button>
                );
              })}
            </div>

            {serviceAreas.length > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                {serviceAreas.length} area{serviceAreas.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </Section>

        </div>

        {/* ── Sticky save bar ── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 px-6 py-4 md:px-12"
          style={{ backgroundColor: "#0a2e30" }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              {saved ? (
                <p
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "#00b096" }}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Services saved!
                </p>
              ) : (
                <p className="text-xs text-white/40">
                  Changes are not saved automatically.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/provider"
                className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl px-8 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#00b096" }}
              >
                {saving ? "Saving…" : "Save Services"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
