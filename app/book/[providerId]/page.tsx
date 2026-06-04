"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { COMMISSION_RATE } from "@/lib/constants";

// ── Types ──────────────────────────────────────────────────────────────────

type AvailSlot = { available: boolean; start?: string; end?: string };

type ProviderService = {
  id: string;
  service_type_id: string;
  rate_small: number | null;
  rate_medium: number | null;
  rate_large: number | null;
  rate_half_small: number | null;
  rate_half_medium: number | null;
  rate_half_large: number | null;
  is_active: boolean;
  availability: Record<string, AvailSlot> | null;
  grooming_mode: "simple" | "itemised" | null;
  service_types: { slug: string; name: string; emoji: string; rate_unit: string } | null;
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

type Dog = { id: string; name: string; breed: string | null; size: string | null; };

type Slot = {
  id: string;
  svcId: string;
  dogIds: string[];
  addonIds: string[];
  selectedDates: string[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  sittingTier: "half" | "full" | "";
};

type DiscountTier = {
  id: string;
  service_type_id: string;
  discount_type: "duration" | "bulk";
  threshold: number;
  percentage: number;
};

type ProviderAddon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

type Pricing = {
  base: number;
  gross: number;
  discountPct: number;
  discountAmt: number;
  addonTotal: number;
};

// ── Constants ──────────────────────────────────────────────────────────────

const RANGE_SLUGS  = new Set(["dog_boarding"]);
const HOURLY_SLUGS = new Set(["dog_walking"]);
const TIERED_SLUGS = new Set(["dog_sitting"]);

const RATE_UNIT_LABEL: Record<string, string> = {
  per_hour: "/ hr", per_12hrs: "/ 12 hrs", per_night: "/ night", per_session: "/ session",
};

const DAYS = [
  { id: "monday", short: "Mon" }, { id: "tuesday", short: "Tue" },
  { id: "wednesday", short: "Wed" }, { id: "thursday", short: "Thu" },
  { id: "friday", short: "Fri" }, { id: "saturday", short: "Sat" },
  { id: "sunday", short: "Sun" },
];

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];
const today   = new Date().toISOString().split("T")[0];

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

function uid() { return Math.random().toString(36).slice(2); }

function emptySlot(): Slot {
  return { id: uid(), svcId: "", dogIds: [], addonIds: [], selectedDates: [], startDate: "", endDate: "", startTime: "", endTime: "", sittingTier: "" };
}

function daysBetween(start: string, end: string) {
  return Math.max(Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1, 1);
}

function rateForDog(svc: ProviderService, dogSize: string | null): number | null {
  const s = (dogSize ?? "").toLowerCase();
  if (s.includes("small"))  return svc.rate_small;
  if (s.includes("medium")) return svc.rate_medium;
  if (s.includes("large"))  return svc.rate_large;
  return svc.rate_small ?? svc.rate_medium ?? svc.rate_large ?? null;
}

function rateHalfForDog(svc: ProviderService, dogSize: string | null): number | null {
  const s = (dogSize ?? "").toLowerCase();
  if (s.includes("small"))  return svc.rate_half_small;
  if (s.includes("medium")) return svc.rate_half_medium;
  if (s.includes("large"))  return svc.rate_half_large;
  return svc.rate_half_small ?? svc.rate_half_medium ?? svc.rate_half_large ?? null;
}

function addHours(time: string, hrs: number): string {
  const [h, m] = time.split(":").map(Number);
  const total  = h * 60 + m + hrs * 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function timeDiffHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 10) / 10;
}

function totalRateForDogs(
  svc: ProviderService,
  dogs: Dog[],
  tier?: "half" | "full" | "",
): number | null {
  if (dogs.length === 0) return null;
  let total = 0;
  for (const dog of dogs) {
    const r = tier === "half" ? rateHalfForDog(svc, dog.size) : rateForDog(svc, dog.size);
    if (r === null) return null;
    total += r;
  }
  return total;
}

function slotGross(slot: Slot, services: ProviderService[], dogs: Dog[]): number | null {
  const svc = services.find(s => s.id === slot.svcId);
  if (!svc) return null;
  const selDogs = dogs.filter(d => slot.dogIds.includes(d.id));
  if (selDogs.length === 0) return null;
  const slug    = svc.service_types?.slug ?? "";
  const isRange  = RANGE_SLUGS.has(slug);
  const isHourly = HOURLY_SLUGS.has(slug);
  const isTiered = TIERED_SLUGS.has(slug);
  const days = isRange
    ? (slot.startDate && slot.endDate ? daysBetween(slot.startDate, slot.endDate) : 0)
    : slot.selectedDates.length;
  if (days === 0) return null;
  if (isTiered) {
    if (!slot.sittingTier) return null;
    const r = totalRateForDogs(svc, selDogs, slot.sittingTier === "half" ? "half" : "full");
    return r !== null ? r * days : null;
  }
  const r = totalRateForDogs(svc, selDogs);
  if (r === null) return null;
  if (isHourly) {
    const hrs = (slot.startTime && slot.endTime && slot.endTime > slot.startTime)
      ? timeDiffHours(slot.startTime, slot.endTime) : 0;
    return hrs > 0 ? r * hrs * days : null;
  }
  return r * days;
}

function slotPricing(
  slot: Slot,
  services: ProviderService[],
  dogs: Dog[],
  discountTiers: DiscountTier[],
  addons: ProviderAddon[],
): Pricing | null {
  const base = slotGross(slot, services, dogs);
  if (base === null) return null;

  const svc = services.find(s => s.id === slot.svcId);
  if (!svc) return null;

  const slug     = svc.service_types?.slug ?? "";
  const isRange  = RANGE_SLUGS.has(slug);
  const isHourly = HOURLY_SLUGS.has(slug);

  let durationCount = 0;
  if (isRange) {
    durationCount = slot.startDate && slot.endDate ? daysBetween(slot.startDate, slot.endDate) : 0;
  } else if (isHourly) {
    const hrs = slot.startTime && slot.endTime && slot.endTime > slot.startTime
      ? timeDiffHours(slot.startTime, slot.endTime) : 0;
    durationCount = hrs * (slot.selectedDates.length || 1);
  } else {
    durationCount = slot.selectedDates.length;
  }

  const dogCount = slot.dogIds.length;
  const tiers    = discountTiers.filter(t => t.service_type_id === svc.service_type_id);

  const durPct = tiers
    .filter(t => t.discount_type === "duration" && durationCount >= Number(t.threshold))
    .reduce((best, t) => Math.max(best, Number(t.percentage)), 0);

  const bulkPct = tiers
    .filter(t => t.discount_type === "bulk" && dogCount >= Number(t.threshold))
    .reduce((best, t) => Math.max(best, Number(t.percentage)), 0);

  const totalPct    = Math.min(durPct + bulkPct, 50);
  const discountAmt = Math.round(base * totalPct / 100 * 100) / 100;

  const addonTotal = Math.round(
    addons.filter(a => slot.addonIds.includes(a.id))
      .reduce((sum, a) => sum + Number(a.price), 0) * 100
  ) / 100;

  return {
    base,
    gross:       Math.round((base - discountAmt + addonTotal) * 100) / 100,
    discountPct: totalPct,
    discountAmt,
    addonTotal,
  };
}

function slotValid(slot: Slot, services: ProviderService[]): boolean {
  if (!slot.svcId || slot.dogIds.length === 0) return false;
  const svc = services.find(s => s.id === slot.svcId);
  if (!svc) return false;
  const slug    = svc.service_types?.slug ?? "";
  const isRange  = RANGE_SLUGS.has(slug);
  const isHourly = HOURLY_SLUGS.has(slug);
  const isTiered = TIERED_SLUGS.has(slug);
  const datesOk = isRange ? !!(slot.startDate && slot.endDate) : slot.selectedDates.length > 0;
  if (!datesOk) return false;
  if (isHourly) return !!(slot.startTime && slot.endTime && slot.endTime > slot.startTime);
  if (isTiered) return !!(slot.sittingTier && slot.startTime);
  return true;
}

function svcAvailDays(svc: ProviderService): string[] {
  const a = svc.availability;
  if (!a) return [];
  return DAYS.filter(d => a[d.id]?.available).map(d => d.short);
}

function svcAvailWindow(svc: ProviderService): { start: string; end: string } | null {
  const a = svc.availability;
  if (!a) return null;
  const slots = Object.values(a).filter(s => s.available && s.start && s.end);
  if (!slots.length) return null;
  const starts = slots.map(s => s.start!).sort();
  const ends   = slots.map(s => s.end!).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

function fmtWindow(w: { start: string; end: string }) {
  return `${w.start.slice(0, 5)} – ${w.end.slice(0, 5)}`;
}

// ── CalendarPicker ─────────────────────────────────────────────────────────

function CalendarPicker({ selected, onChange }: { selected: string[]; onChange: (d: string[]) => void }) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const firstOfMonth = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset  = (firstOfMonth.getDay() + 6) % 7;
  const monthLabel   = firstOfMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const pad = (n: number) => String(n).padStart(2, "0");
  const toStr = (d: number) => `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
  function toggle(ds: string) {
    onChange(selected.includes(ds) ? selected.filter(d => d !== ds) : [...selected, ds].sort());
  }
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  const cells: (string | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toStr(i + 1))];
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100">‹</button>
        <span className="text-sm font-bold" style={{ color: "#0a2e30" }}>{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100">›</button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center">
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => <span key={d} className="text-[10px] font-semibold text-gray-400">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((ds, i) => {
          if (!ds) return <div key={`e-${i}`} />;
          const isPast = ds < today; const isSel = selected.includes(ds); const isToday = ds === today;
          return (
            <button key={ds} type="button" disabled={isPast} onClick={() => toggle(ds)}
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition"
              style={isSel ? { backgroundColor: "#00b096", color: "#fff", fontWeight: 700 }
                : isPast ? { color: "#d1d5db", cursor: "not-allowed" }
                : isToday ? { border: "2px solid #00b096", color: "#0a2e30", fontWeight: 600 }
                : { color: "#374151" }}>
              {parseInt(ds.split("-")[2])}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {selected.length > 0 ? (
          <>
            <p className="text-xs font-semibold" style={{ color: "#00b096" }}>{selected.length} date{selected.length !== 1 ? "s" : ""} selected</p>
            <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-red-400">Clear all</button>
          </>
        ) : <p className="text-xs text-gray-400">Tap dates to select</p>}
      </div>
    </div>
  );
}

// ── SlotPanel ──────────────────────────────────────────────────────────────

function SlotPanel({
  slot, index, canRemove, services, dogs, discountTiers, addons,
  onChange, onRemove,
}: {
  slot: Slot; index: number; canRemove: boolean;
  services: ProviderService[]; dogs: Dog[];
  discountTiers: DiscountTier[];
  addons: ProviderAddon[];
  onChange: (patch: Partial<Slot>) => void;
  onRemove: () => void;
}) {
  const svc      = services.find(s => s.id === slot.svcId) ?? null;
  const slug     = svc?.service_types?.slug ?? "";
  const isRange  = RANGE_SLUGS.has(slug);
  const isHourly = HOURLY_SLUGS.has(slug);
  const isTiered = TIERED_SLUGS.has(slug);
  const isItemised = svc?.grooming_mode === "itemised";

  const selDogs     = dogs.filter(d => slot.dogIds.includes(d.id));
  const availDays   = svc ? svcAvailDays(svc) : [];
  const availWindow = (svc && (isHourly || isTiered)) ? svcAvailWindow(svc) : null;

  const durationHours  = (isHourly && slot.startTime && slot.endTime && slot.endTime > slot.startTime)
    ? timeDiffHours(slot.startTime, slot.endTime) : 0;
  const sittingDuration = slot.sittingTier === "half" ? 6 : slot.sittingTier === "full" ? 12 : 0;
  const sittingEndTime  = (isTiered && slot.startTime && slot.sittingTier)
    ? addHours(slot.startTime, sittingDuration) : "";

  const sittingTimeOk = !availWindow || (
    (!slot.startTime || slot.startTime >= availWindow.start) &&
    (!sittingEndTime || sittingEndTime <= availWindow.end)
  );
  const hourlyTimeOk = !availWindow || (
    (!slot.startTime || slot.startTime >= availWindow.start) &&
    (!slot.endTime   || slot.endTime   <= availWindow.end)
  );

  const pricing    = slotPricing(slot, services, dogs, discountTiers, addons);
  const gross      = pricing?.gross ?? null;
  const commission = gross !== null ? Math.round(gross * COMMISSION_RATE * 100) / 100 : null;

  const INPUT = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Slot header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3"
        style={{ backgroundColor: "rgba(0,176,150,.04)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00b096" }}>
          Service request {index + 1}
        </p>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="text-xs text-gray-400 hover:text-red-500 transition">
            Remove ✕
          </button>
        )}
      </div>

      <div className="space-y-5 p-5">

        {/* ── Service selector ── */}
        <div>
          <p className="mb-3 text-sm font-bold" style={{ color: "#0a2e30" }}>Select Service</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map(s => {
              const st  = s.service_types;
              if (!st) return null;
              const sel = s.id === slot.svcId;
              const minRate = s.rate_small ?? s.rate_medium ?? s.rate_large;
              return (
                <button key={s.id} type="button"
                  onClick={() => onChange({ svcId: s.id, selectedDates: [], startDate: "", endDate: "", startTime: "", endTime: "", sittingTier: "" })}
                  className="flex items-center gap-3 rounded-xl border p-3.5 text-left transition"
                  style={sel ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.06)" } : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}>
                  <span className="text-2xl">{st.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{st.name}</p>
                    <p className="text-xs text-gray-400">
                      {RATE_UNIT_LABEL[st.rate_unit] ?? st.rate_unit.replace(/_/g, " ")}
                    </p>
                  </div>
                  {st.slug === "dog_sitting" ? (
                    <span className="shrink-0 text-xs text-gray-400">Half / Full day</span>
                  ) : s.grooming_mode === "itemised" ? (
                    <span className="shrink-0 text-xs text-gray-400">Itemised</span>
                  ) : minRate !== null && minRate !== undefined ? (
                    <span className="shrink-0 text-xs text-gray-400">from GHS {minRate}</span>
                  ) : null}
                  {sel && <span className="ml-1 shrink-0 text-xs font-bold" style={{ color: "#00b096" }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Dog selector (multi-select) ── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>Select Dog{dogs.length > 1 ? "s" : ""}</p>
            {dogs.length > 1 && (
              <button type="button"
                onClick={() => onChange({ dogIds: slot.dogIds.length === dogs.length ? [] : dogs.map(d => d.id) })}
                className="text-xs font-semibold transition hover:opacity-70"
                style={{ color: "#00b096" }}>
                {slot.dogIds.length === dogs.length ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>
          {dogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-8 text-center">
              <span className="mb-2 text-3xl">🐶</span>
              <p className="text-sm font-medium text-gray-600">No dogs registered yet</p>
              <Link href="/dashboard/owner" className="mt-3 rounded-full px-5 py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#00b096" }}>
                Add a dog
              </Link>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {dogs.map(dog => {
                const checked = slot.dogIds.includes(dog.id);
                const dogRate = svc && !isItemised && !isTiered ? rateForDog(svc, dog.size) : null;
                const halfDogRate = svc && isTiered && slot.sittingTier === "half" ? rateHalfForDog(svc, dog.size) : null;
                const fullDogRate = svc && isTiered && slot.sittingTier === "full" ? rateForDog(svc, dog.size) : null;
                const displayRate = isTiered ? (halfDogRate ?? fullDogRate) : dogRate;
                return (
                  <button key={dog.id} type="button"
                    onClick={() => {
                      const next = checked ? slot.dogIds.filter(id => id !== dog.id) : [...slot.dogIds, dog.id];
                      onChange({ dogIds: next });
                    }}
                    className="flex items-center gap-3 rounded-xl border p-3.5 text-left transition"
                    style={checked ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.06)" } : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}>
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold text-white transition"
                      style={checked ? { backgroundColor: "#00b096", borderColor: "#00b096" } : { borderColor: "#d1d5db" }}>
                      {checked ? "✓" : ""}
                    </span>
                    <span className="text-xl">🐕</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: "#0a2e30" }}>{dog.name}</p>
                      <p className="text-xs text-gray-400">{[dog.breed, dog.size].filter(Boolean).join(" · ") || "No details"}</p>
                    </div>
                    {displayRate !== null && (
                      <span className="shrink-0 text-sm font-extrabold" style={{ color: "#00b096" }}>GHS {displayRate}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {selDogs.length > 1 && svc && !isTiered && !isItemised && (
            <p className="mt-2 text-xs font-semibold" style={{ color: "#00b096" }}>
              Combined rate: GHS {totalRateForDogs(svc, selDogs) ?? "—"} for {selDogs.length} dogs
            </p>
          )}
          {isItemised && (
            <p className="mt-2.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ✂️ Itemised grooming — final cost depends on services chosen. Discuss via chat after booking.
            </p>
          )}
        </div>

        {/* ── Date / time picker ── */}
        {slot.svcId && (
          <div>
            <p className="mb-1 text-sm font-bold" style={{ color: "#0a2e30" }}>
              {(isHourly || isTiered) ? "Select Dates & Time" : "Select Dates"}
            </p>
            {availDays.length > 0 && (
              <p className="mb-3 text-xs text-gray-500">
                Available on: <span className="font-semibold" style={{ color: "#00b096" }}>{availDays.join(", ")}</span>
                {availWindow && <span className="ml-1 text-gray-400">({fmtWindow(availWindow)})</span>}
              </p>
            )}

            {isRange ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Check-in date</label>
                  <input type="date" min={today} value={slot.startDate}
                    onChange={e => { const v = e.target.value; onChange({ startDate: v, endDate: slot.endDate && v > slot.endDate ? v : slot.endDate }); }}
                    className={INPUT} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Check-out date</label>
                  <input type="date" min={slot.startDate || today} value={slot.endDate}
                    onChange={e => onChange({ endDate: e.target.value })}
                    className={INPUT} />
                </div>
              </div>
            ) : (
              <>
                <CalendarPicker selected={slot.selectedDates} onChange={v => onChange({ selectedDates: v })} />

                {/* Tiered sitting */}
                {isTiered && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500">Session type</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(["half", "full"] as const).map(tier => {
                        const tierTotal = svc ? totalRateForDogs(svc, selDogs, tier === "half" ? "half" : "full") : null;
                        return (
                          <button key={tier} type="button" onClick={() => onChange({ sittingTier: tier })}
                            className="rounded-xl border p-4 text-left transition"
                            style={slot.sittingTier === tier ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.06)" } : { borderColor: "#e5e7eb" }}>
                            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>{tier === "half" ? "Half day" : "Full day"}</p>
                            <p className="text-xs text-gray-400">{tier === "half" ? "6 hours" : "12 hours"}</p>
                            {tierTotal !== null ? (
                              <p className="mt-1.5 text-sm font-extrabold" style={{ color: "#00b096" }}>
                                GHS {tierTotal}
                                {selDogs.length > 1 && <span className="text-xs font-normal text-gray-400"> total</span>}
                              </p>
                            ) : selDogs.length > 0 ? (
                              <p className="mt-1 text-xs text-gray-400">Rate on request</p>
                            ) : (
                              <p className="mt-1 text-xs text-gray-400">Select dogs for price</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {slot.sittingTier && (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-500">Preferred start time</label>
                        <input type="time" value={slot.startTime}
                          min={availWindow?.start} max={availWindow?.end}
                          onChange={e => onChange({ startTime: e.target.value })}
                          className={INPUT} />
                        {slot.startTime && sittingEndTime && (
                          <p className="mt-2 text-xs font-semibold" style={{ color: "#00b096" }}>
                            Sitter with your dog{selDogs.length > 1 ? "s" : ""}: {slot.startTime} – {sittingEndTime}
                          </p>
                        )}
                        {availWindow && <p className="mt-1 text-xs text-gray-400">Provider available: <span className="font-semibold text-gray-600">{fmtWindow(availWindow)}</span></p>}
                        {slot.startTime && availWindow && slot.startTime < availWindow.start && (
                          <p className="mt-1 text-xs font-medium text-red-500">Start time is before provider&apos;s hours ({fmtWindow(availWindow)}).</p>
                        )}
                        {sittingEndTime && availWindow && sittingEndTime > availWindow.end && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            This {slot.sittingTier === "half" ? "6-hour" : "12-hour"} session ends at {sittingEndTime}, exceeding the provider&apos;s hours.
                          </p>
                        )}
                        {!sittingTimeOk && slot.startTime && <span />}
                      </div>
                    )}
                  </div>
                )}

                {/* Hourly walking */}
                {isHourly && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500">Preferred time</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs text-gray-400">Start time</label>
                        <input type="time" value={slot.startTime}
                          min={availWindow?.start} max={slot.endTime || availWindow?.end}
                          onChange={e => onChange({ startTime: e.target.value })} className={INPUT} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs text-gray-400">End time</label>
                        <input type="time" value={slot.endTime}
                          min={slot.startTime || availWindow?.start} max={availWindow?.end}
                          onChange={e => onChange({ endTime: e.target.value })} className={INPUT} />
                      </div>
                    </div>
                    {durationHours > 0 && (
                      <p className="text-xs font-semibold" style={{ color: "#00b096" }}>Duration: {durationHours} hr{durationHours !== 1 ? "s" : ""}</p>
                    )}
                    {availWindow && <p className="text-xs text-gray-400">Provider available: <span className="font-semibold text-gray-600">{fmtWindow(availWindow)}</span></p>}
                    {slot.startTime && slot.endTime && slot.endTime <= slot.startTime && (
                      <p className="text-xs font-medium text-red-500">End time must be after start time.</p>
                    )}
                    {slot.startTime && availWindow && slot.startTime < availWindow.start && (
                      <p className="text-xs font-medium text-red-500">Start time is before provider&apos;s hours ({fmtWindow(availWindow)}).</p>
                    )}
                    {slot.endTime && availWindow && slot.endTime > availWindow.end && (
                      <p className="text-xs font-medium text-red-500">End time exceeds provider&apos;s hours ({fmtWindow(availWindow)}).</p>
                    )}
                    {!hourlyTimeOk && <span />}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Add-ons ── */}
        {addons.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold" style={{ color: "#0a2e30" }}>Optional Add-ons</p>
            <div className="space-y-2">
              {addons.map(addon => {
                const checked = slot.addonIds.includes(addon.id);
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => onChange({
                      addonIds: checked
                        ? slot.addonIds.filter(id => id !== addon.id)
                        : [...slot.addonIds, addon.id],
                    })}
                    className="flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition"
                    style={checked
                      ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.06)" }
                      : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}
                  >
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${checked ? "bg-[#00b096] border-[#00b096]" : "border-gray-300"}`}>
                      {checked && <span className="text-[10px] font-bold leading-none text-white">✓</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{addon.name}</p>
                      {addon.description && <p className="mt-0.5 text-xs text-gray-400">{addon.description}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold" style={{ color: "#0a2e30" }}>
                      + GHS {Number(addon.price).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Mini price for this slot ── */}
        {pricing !== null && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            {pricing.discountPct > 0 && (
              <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-1.5">
                <span className="text-xs font-bold text-green-600">{pricing.discountPct}% off</span>
                <span className="text-xs text-gray-400 line-through">GHS {pricing.base.toFixed(2)}</span>
                <span className="text-xs font-semibold text-green-600">saving GHS {pricing.discountAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {selDogs.length > 1 && <span>{selDogs.length} dogs · </span>}
                {isTiered ? (
                  <span>{slot.sittingTier === "half" ? "Half day" : "Full day"}</span>
                ) : isHourly && durationHours > 0 ? (
                  <span>{durationHours} hr{durationHours !== 1 ? "s" : ""}</span>
                ) : null}
              </div>
              <p className="text-base font-extrabold" style={{ color: "#0a2e30" }}>
                GHS {pricing.gross.toFixed(2)}
              </p>
            </div>
            {pricing.addonTotal > 0 && (
              <p className="mt-0.5 text-[10px] text-gray-400">
                incl. GHS {pricing.addonTotal.toFixed(2)} add-ons
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-gray-400">
              + GHS {commission?.toFixed(2)} platform fee
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function BookPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [provider,       setProvider]       = useState<ProviderInfo | null>(null);
  const [services,       setServices]       = useState<ProviderService[]>([]);
  const [dogs,           setDogs]           = useState<Dog[]>([]);
  const [discountTiers,  setDiscountTiers]  = useState<DiscountTier[]>([]);
  const [addons,         setAddons]         = useState<ProviderAddon[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [dateWarning, setDateWarning] = useState(false);
  const [slots,       setSlots]       = useState<Slot[]>([emptySlot()]);
  const [notes,          setNotes]          = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace(`/login?redirect=/book/${providerId}`); return; }

      const [apiRes, { data: d }] = await Promise.all([
        fetch(`/api/providers/${providerId}`),
        sb.from("dogs").select("id, name, breed, size").eq("owner_id", user.id).order("created_at"),
      ]);

      if (cancelled) return;
      if (!apiRes.ok) { router.replace("/search"); return; }

      const { provider: p, services: activeSvcs, discountTiers: tiers, addons: addonRows } = await apiRes.json();
      if (!p) { router.replace("/search"); return; }

      // Pre-select service from ?service= param, or auto-select if only one
      const preselect = searchParams.get("service");
      const preselectMatch = preselect && (activeSvcs as ProviderService[]).find(s => s.id === preselect);
      if (preselectMatch) {
        setSlots([{ ...emptySlot(), svcId: (preselectMatch as ProviderService).id }]);
      } else if ((activeSvcs as ProviderService[]).length === 1) {
        setSlots([{ ...emptySlot(), svcId: (activeSvcs as ProviderService[])[0].id }]);
      }

      setProvider(p as unknown as ProviderInfo);
      setServices((activeSvcs ?? []) as unknown as ProviderService[]);
      setDogs((d ?? []) as Dog[]);
      setDiscountTiers((tiers ?? []) as DiscountTier[]);
      setAddons((addonRows ?? []) as ProviderAddon[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [providerId, router]);

  function updateSlot(id: string, patch: Partial<Slot>) {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function removeSlot(id: string) {
    setSlots(prev => prev.filter(s => s.id !== id));
  }

  function addSlot() {
    setSlots(prev => [...prev, emptySlot()]);
  }

  const validSlots = slots.filter(s => slotValid(s, services));
  const totalGross = validSlots.reduce((sum, s) => sum + (slotPricing(s, services, dogs, discountTiers, addons)?.gross ?? 0), 0);
  const totalComm  = Math.round(totalGross * COMMISSION_RATE * 100) / 100;
  const totalSaved = validSlots.reduce((sum, s) => sum + (slotPricing(s, services, dogs, discountTiers, addons)?.discountAmt ?? 0), 0);
  const canSubmit  = validSlots.length > 0 && !submitting && policyAccepted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !provider) return;
    setSubmitting(true);
    setError(null);

    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const createdIds: string[] = [];

    for (const slot of validSlots) {
      const svc = services.find(s => s.id === slot.svcId)!;
      const slug     = svc.service_types?.slug ?? "";
      const isRange  = RANGE_SLUGS.has(slug);
      const isHourly = HOURLY_SLUGS.has(slug);
      const isTiered = TIERED_SLUGS.has(slug);

      const effectiveStart = isRange ? slot.startDate : slot.selectedDates[0];
      const effectiveEnd   = isRange ? slot.endDate   : slot.selectedDates[slot.selectedDates.length - 1];

      // Soft conflict check
      const { data: conflicts } = await sb.from("bookings").select("id")
        .eq("provider_id", provider.id).neq("status", "cancelled")
        .lte("start_date", effectiveEnd).gte("end_date", effectiveStart).limit(1);
      if (conflicts && conflicts.length > 0) setDateWarning(true);

      const gross    = slotPricing(slot, services, dogs, discountTiers, addons)?.gross ?? 0;
      const comm     = Math.round(gross * COMMISSION_RATE * 100) / 100;
      const payout   = Math.round((gross - comm) * 100) / 100;

      const sittingDur    = slot.sittingTier === "half" ? 6 : slot.sittingTier === "full" ? 12 : 0;
      const sittingEnd    = (isTiered && slot.startTime && slot.sittingTier) ? addHours(slot.startTime, sittingDur) : null;
      const durationHours = (isHourly && slot.startTime && slot.endTime && slot.endTime > slot.startTime)
        ? timeDiffHours(slot.startTime, slot.endTime) : null;

      const { data: booking, error: bookingErr } = await sb.from("bookings").insert({
        owner_id:           user.id,
        provider_id:        provider.id,
        dog_id:             slot.dogIds[0],
        additional_dog_ids: slot.dogIds.length > 1 ? slot.dogIds.slice(1) : null,
        service_type:       slug,
        start_date:         effectiveStart,
        end_date:           effectiveEnd,
        selected_dates:     isRange ? null : slot.selectedDates,
        preferred_time:     (isHourly || isTiered) ? (slot.startTime || null) : null,
        preferred_end_time: isHourly ? (slot.endTime || null) : isTiered ? (sittingEnd || null) : null,
        duration_hours:     isHourly ? (durationHours || null) : isTiered ? (sittingDur || null) : null,
        status:             "pending",
        gross_amount:       gross,
        commission_amount:  comm,
        provider_payout:    payout,
        addon_ids:          slot.addonIds.length > 0 ? slot.addonIds : null,
      }).select("id").single();

      if (bookingErr || !booking) {
        setError(bookingErr?.message ?? "Failed to create booking. Please try again.");
        setSubmitting(false);
        return;
      }
      createdIds.push(booking.id);
    }

    if (notes.trim() && createdIds[0]) {
      await sb.from("messages").insert({ booking_id: createdIds[0], sender_id: user.id, content: notes.trim() });
    }

    router.push(createdIds.length === 1 ? `/booking/${createdIds[0]}` : "/dashboard/owner");
  }

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  if (!provider) return null;

  const pUser = resolveUser(provider.users);
  const name  = pUser?.name ?? "DogCare Provider";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <Link href={`/provider/${providerId}`} className="text-sm text-white/60 transition hover:text-white">← Back to profile</Link>
      </nav>

      {/* Hero */}
      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Booking request</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">Book with {name.split(" ")[0]}</h1>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">

        {/* Provider mini-card */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {provider.avatar_url ? (
            <img src={provider.avatar_url} alt={name} className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white" style={{ backgroundColor: avatarBg(provider.user_id) }}>
              {ini(name)}
            </div>
          )}
          <div className="flex-1">
            <p className="font-bold" style={{ color: "#0a2e30" }}>{name}</p>
            {provider.neighbourhood && <p className="text-xs text-gray-400">📍 {provider.neighbourhood}</p>}
            <div className="mt-0.5 flex items-center gap-2">
              <span style={{ color: "#f59e0b" }}>★</span>
              <span className="text-xs font-semibold text-gray-700">{Number(provider.rating_avg) > 0 ? Number(provider.rating_avg).toFixed(1) : "New"}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={provider.active ? { background: "rgba(0,176,150,.12)", color: "#00b096" } : { background: "rgba(239,68,68,.1)", color: "#dc2626" }}>
                {provider.active ? "Available" : "Unavailable"}
              </span>
            </div>
          </div>
        </div>

        {!provider.active && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This provider is currently not accepting bookings. You can still send a request.
          </div>
        )}

        {services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-2xl mb-2">🐾</p>
            <p className="font-semibold text-gray-700">No services available</p>
            <Link href="/search" className="mt-4 inline-block rounded-full px-5 py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#00b096" }}>Find another provider</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Slot panels */}
            {slots.map((slot, i) => (
              <SlotPanel
                key={slot.id}
                slot={slot}
                index={i}
                canRemove={slots.length > 1}
                services={services}
                dogs={dogs}
                discountTiers={discountTiers}
                addons={addons}
                onChange={patch => updateSlot(slot.id, patch)}
                onRemove={() => removeSlot(slot.id)}
              />
            ))}

            {/* Add another service */}
            {slots.length < 3 && (
              <button type="button" onClick={addSlot}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-semibold text-gray-400 transition hover:border-[#00b096] hover:text-[#00b096]">
                + Add another service from this provider
              </button>
            )}

            {/* Notes */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-bold" style={{ color: "#0a2e30" }}>
                Notes <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Special requirements, routines, allergies, feeding schedules…"
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20" />
            </div>

            {/* Total price summary */}
            {validSlots.length > 0 && totalGross > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold" style={{ color: "#0a2e30" }}>
                  {validSlots.length > 1 ? "Total for all services" : "Price Summary"}
                </p>
                <div className="space-y-2 text-sm">
                  {validSlots.length > 1 && validSlots.map((s) => {
                    const p = slotPricing(s, services, dogs, discountTiers, addons);
                    const sv = services.find(sv => sv.id === s.svcId);
                    return p !== null ? (
                      <div key={s.id} className="flex justify-between text-gray-500 text-xs">
                        <span>{sv?.service_types?.emoji} {sv?.service_types?.name}{s.dogIds.length > 1 ? ` (${s.dogIds.length} dogs)` : ""}</span>
                        <span>GHS {p.gross.toFixed(2)}</span>
                      </div>
                    ) : null;
                  })}
                  {totalSaved > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-green-600">
                      <span>Discount savings</span>
                      <span>–GHS {totalSaved.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Platform fee (10%)</span>
                    <span>GHS {totalComm.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-extrabold" style={{ color: "#0a2e30" }}>
                    <span>Total</span>
                    <span>GHS {totalGross.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {dateWarning && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                ⚠️ This provider may already have a booking on these dates. Your request has been sent — they&apos;ll confirm availability.
              </p>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
            )}

            {/* Cancellation policy acceptance */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={e => setPolicyAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#00b096]"
              />
              <span className="text-xs leading-relaxed text-gray-600">
                I understand the <strong>cancellation policy</strong>: full refund if cancelled 48+ hours before the service date; a 15% fee applies if cancelled within 48 hours (same-day bookings are exempt). For ongoing bookings cancelled mid-service, the provider is paid for days worked and the balance is refunded, less the 15% fee where applicable.
              </span>
            </label>

            <button type="submit" disabled={!canSubmit}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: "#00b096" }}>
              {submitting ? "Sending…" : validSlots.length > 1 ? `Send ${validSlots.length} booking requests` : "Request Booking"}
            </button>

            <p className="text-center text-xs text-gray-400">
              No payment required — the provider has 24 hours to accept.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
