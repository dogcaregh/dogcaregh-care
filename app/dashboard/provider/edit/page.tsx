"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LocationPicker } from "@/components/location-picker";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceId =
  | "pet_sitting" | "doggy_daycare" | "dog_boarding"
  | "mobile_grooming" | "dog_walking";

type DayId =
  | "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";

type AvailSlot = { available: boolean; start: string; end: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES: { id: ServiceId; emoji: string; label: string; unit: string }[] = [
  { id: "pet_sitting",     emoji: "🐾", label: "Pet Sitting",     unit: "/ visit"   },
  { id: "doggy_daycare",   emoji: "🏡", label: "Doggy Daycare",   unit: "/ day"     },
  { id: "dog_boarding",    emoji: "🛏️", label: "Dog Boarding",    unit: "/ night"   },
  { id: "mobile_grooming", emoji: "✂️", label: "Mobile Grooming", unit: "/ session" },
  { id: "dog_walking",     emoji: "🦮", label: "Dog Walking",     unit: "/ walk"    },
];

const DAYS: { id: DayId; short: string; label: string }[] = [
  { id: "monday",    short: "Mon", label: "Monday"    },
  { id: "tuesday",   short: "Tue", label: "Tuesday"   },
  { id: "wednesday", short: "Wed", label: "Wednesday" },
  { id: "thursday",  short: "Thu", label: "Thursday"  },
  { id: "friday",    short: "Fri", label: "Friday"    },
  { id: "saturday",  short: "Sat", label: "Saturday"  },
  { id: "sunday",    short: "Sun", label: "Sunday"    },
];


const MAX_GALLERY = 6;

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:bg-white focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-extrabold" style={{ color: "#0a2e30" }}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex items-center gap-3"
    >
      <div
        className="relative h-6 w-11 rounded-full transition-colors duration-200"
        style={{ backgroundColor: on ? "#00b096" : "#d1d5db" }}
      >
        <div
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: on ? "translateX(20px)" : "translateX(2px)" }}
        />
      </div>
      <span className="text-sm font-medium" style={{ color: "#0a2e30" }}>{label}</span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const router = useRouter();

  const [userId,     setUserId]     = useState("");
  const [providerId, setProviderId] = useState("");

  // Personal
  const [name,         setName]         = useState("");
  const [phone,        setPhone]        = useState("");
  const [bio,          setBio]          = useState("");
  const [neighbourhood,setNeighbourhood]= useState("");
  const [yearsExp,     setYearsExp]     = useState<number | "">("");
  const [active,       setActive]       = useState(true);

  // Services & rates
  const [services, setServices] = useState<ServiceId[]>([]);
  const [rates,    setRates]    = useState<Partial<Record<ServiceId, string>>>({});

  // Availability
  const [avail, setAvail] = useState<Partial<Record<DayId, AvailSlot>>>({});

  // Photos
  const [avatarUrl,        setAvatarUrl]        = useState<string | null>(null);
  const [avatarPreview,    setAvatarPreview]    = useState<string | null>(null);
  const [gallery,          setGallery]          = useState<string[]>([]);

  // UI
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [avatarUploading,  setAvatarUploading]  = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [saved,            setSaved]            = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  const avatarInputRef  = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Load existing data ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/provider/edit"); return; }

      const [uRes, pRes] = await Promise.all([
        sb.from("users").select("name, phone").eq("id", user.id).single(),
        sb.from("providers")
          .select("id, bio, years_experience, neighbourhood, active, services, rates, availability, avatar_url, gallery_photos")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (!pRes.data) { router.replace("/register/provider"); return; }

      const u = uRes.data  as { name: string; phone: string | null } | null;
      const p = pRes.data as {
        id: string; bio: string | null; years_experience: number | null;
        neighbourhood: string | null; active: boolean;
        services: ServiceId[]; rates: Record<string, number>;
        availability: Record<string, { available?: boolean; start?: string; end?: string }>;
        avatar_url: string | null; gallery_photos: string[];
      };

      setUserId(user.id);
      setProviderId(p.id);
      setName(u?.name ?? "");
      setPhone(u?.phone ?? "");
      setBio(p.bio ?? "");
      setNeighbourhood(p.neighbourhood ?? "");
      setYearsExp(p.years_experience ?? "");
      setActive(p.active);
      setServices(p.services ?? []);

      const rateMap: Partial<Record<ServiceId, string>> = {};
      for (const [k, v] of Object.entries(p.rates ?? {})) {
        rateMap[k as ServiceId] = String(v);
      }
      setRates(rateMap);

      const availMap: Partial<Record<DayId, AvailSlot>> = {};
      for (const day of DAYS) {
        const slot = (p.availability ?? {})[day.id];
        availMap[day.id] = {
          available: slot?.available !== false,
          start:     slot?.start ?? "08:00",
          end:       slot?.end   ?? "18:00",
        };
      }
      setAvail(availMap);

      setAvatarUrl(p.avatar_url);
      setGallery(p.gallery_photos ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  // ── Service toggle ────────────────────────────────────────────────────────
  function toggleService(id: ServiceId) {
    setServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  // ── Avatar upload (immediate) ─────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    const sb  = createClient();
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar_${Date.now()}.${ext}`;

    const { error: upErr } = await sb.storage
      .from("provider-photos")
      .upload(path, file, { upsert: true });

    if (!upErr) {
      const { data: { publicUrl } } = sb.storage.from("provider-photos").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      setAvatarPreview(null);
    }
    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  // ── Gallery upload ────────────────────────────────────────────────────────
  async function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []) as File[];
    if (!files.length || !userId) return;

    if (gallery.length + files.length > MAX_GALLERY) {
      setError(`Maximum ${MAX_GALLERY} gallery photos. Remove some first.`);
      return;
    }

    setGalleryUploading(true);
    const sb = createClient();
    const newUrls: string[] = [];

    for (const file of files) {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/gallery_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await sb.storage.from("provider-photos").upload(path, file);
      if (!upErr) {
        const { data: { publicUrl } } = sb.storage.from("provider-photos").getPublicUrl(path);
        newUrls.push(publicUrl);
      }
    }

    setGallery(prev => [...prev, ...newUrls]);
    setGalleryUploading(false);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  // ── Delete gallery photo ──────────────────────────────────────────────────
  async function deleteGalleryPhoto(url: string) {
    const updated = gallery.filter(u => u !== url);
    setGallery(updated);

    const sb = createClient();
    await sb.from("providers").update({ gallery_photos: updated }).eq("id", providerId);

    // Extract storage path from public URL
    const match = url.match(/\/provider-photos\/(.+)$/);
    if (match?.[1]) {
      await sb.storage.from("provider-photos").remove([decodeURIComponent(match[1])]);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (services.length === 0) {
      setError("Please select at least one service.");
      return;
    }
    setSaving(true);
    setError(null);

    const sb = createClient();

    // Build rates (only for selected services, numeric)
    const ratesNum: Record<string, number> = {};
    for (const svc of services) {
      const v = rates[svc];
      if (v && !isNaN(Number(v)) && Number(v) > 0) ratesNum[svc] = Number(v);
    }

    // Build availability
    const availObj: Record<string, { available: boolean; start?: string; end?: string }> = {};
    for (const day of DAYS) {
      const slot = avail[day.id];
      if (slot) {
        availObj[day.id] = {
          available: slot.available,
          ...(slot.available && slot.start ? { start: slot.start } : {}),
          ...(slot.available && slot.end   ? { end: slot.end }     : {}),
        };
      }
    }

    const [uErr, pErr] = await Promise.all([
      sb.from("users")
        .update({ name: name.trim(), phone: phone.trim() || null })
        .eq("id", userId)
        .then(r => r.error),
      sb.from("providers")
        .update({
          bio:              bio.trim() || null,
          years_experience: yearsExp !== "" ? Number(yearsExp) : null,
          neighbourhood:    neighbourhood.trim() || null,
          location:         neighbourhood.trim() || null,
          active,
          services,
          rates:            ratesNum,
          availability:     availObj,
          avatar_url:       avatarUrl,
          gallery_photos:   gallery,
        })
        .eq("id", providerId)
        .then(r => r.error),
    ]);

    if (uErr || pErr) {
      setError((uErr ?? pErr)?.message ?? "Failed to save. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-2xl font-bold text-white">Dog<span style={{ color: "#00b096" }}>Care</span>GH</p>
        <p className="mt-3 animate-pulse text-sm text-white/50">Loading profile…</p>
      </div>
    );
  }

  const displayAvatar = avatarPreview ?? avatarUrl;

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
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/provider"
            className="text-xs font-medium text-white/60 transition hover:text-white"
          >
            ← Dashboard
          </Link>
          {providerId && (
            <Link
              href={`/provider/${providerId}`}
              target="_blank"
              className="hidden rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 sm:block"
            >
              View Public Profile ↗
            </Link>
          )}
        </div>
      </nav>

      {/* ── Header band ── */}
      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
          Provider Settings
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">Edit Your Profile</h1>
        <p className="mt-1 text-sm text-white/50">
          Keep your profile up to date so owners can find and trust you.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-32 md:px-8">

          {/* ── Error banner ── */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
              <span className="text-lg">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-500">✕</button>
            </div>
          )}

          {/* ── 1. Profile Photo ── */}
          <Section title="Profile Photo" subtitle="Shown on your public profile and in booking cards.">
            <div className="flex items-center gap-6">
              <div className="relative">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={name}
                    className="h-24 w-24 rounded-2xl object-cover shadow-md"
                  />
                ) : (
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-2xl text-2xl font-extrabold text-white shadow-md"
                    style={{ backgroundColor: userId ? avatarBg(userId) : "#00b096" }}
                  >
                    {ini(name)}
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                    <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>

              <div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {avatarUploading ? "Uploading…" : displayAvatar ? "Change Photo" : "Upload Photo"}
                </button>
                {displayAvatar && (
                  <button
                    type="button"
                    onClick={() => { setAvatarUrl(null); setAvatarPreview(null); }}
                    className="ml-2 text-xs text-gray-400 transition hover:text-red-500"
                  >
                    Remove
                  </button>
                )}
                <p className="mt-1.5 text-xs text-gray-400">JPG, PNG or WebP · Max 5 MB</p>
              </div>
            </div>
          </Section>

          {/* ── 2. Personal Details ── */}
          <Section title="Personal Details" subtitle="Your name is public. Your phone number is private and only used for support.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>
                  Full Name
                  {name && (
                    <span className="ml-2 font-normal text-gray-400">
                      — shown as <strong className="text-gray-600">{name.split(" ")[0]}</strong>
                    </span>
                  )}
                </label>
                <input
                  className={INPUT}
                  type="text"
                  placeholder="Your full name"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>
                  Phone Number
                  <span className="ml-1 font-normal text-gray-400">(private)</span>
                </label>
                <input
                  className={INPUT}
                  type="tel"
                  placeholder="024 000 0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Neighbourhood / Area</label>
                <LocationPicker
                  value={neighbourhood}
                  onChange={setNeighbourhood}
                  placeholder="e.g. East Legon"
                  datalistId="provider-location-areas"
                />
              </div>
              <div>
                <label className={LABEL}>Years of Experience</label>
                <input
                  className={INPUT}
                  type="number"
                  min={0}
                  max={50}
                  placeholder="e.g. 3"
                  value={yearsExp}
                  onChange={e => setYearsExp(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Bio</label>
                <textarea
                  className={INPUT}
                  rows={4}
                  placeholder="Tell owners about yourself — your experience, your home setup, why you love caring for dogs…"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
              <div className="sm:col-span-2">
                <Toggle
                  on={active}
                  onChange={setActive}
                  label={active ? "Accepting new bookings" : "Not accepting bookings (profile hidden from search)"}
                />
              </div>
            </div>
          </Section>

          {/* ── 3. Services & Rates ── */}
          <Section title="Services & Rates" subtitle="Select the services you offer and set your GHS rate for each.">
            <div className="space-y-3">
              {SERVICES.map(svc => {
                const on = services.includes(svc.id);
                return (
                  <div
                    key={svc.id}
                    className="flex flex-wrap items-center gap-4 rounded-xl border p-4 transition"
                    style={on
                      ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.04)" }
                      : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleService(svc.id)}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold text-white transition"
                        style={on
                          ? { backgroundColor: "#00b096", borderColor: "#00b096" }
                          : { borderColor: "#d1d5db" }}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className="text-xl">{svc.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: on ? "#0a2e30" : "#6b7280" }}>
                          {svc.label}
                        </p>
                        <p className="text-xs text-gray-400">{svc.unit}</p>
                      </div>
                    </button>

                    {/* Rate input (only when selected) */}
                    {on && (
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">GHS</span>
                        <input
                          type="number"
                          min={1}
                          placeholder="0"
                          value={rates[svc.id] ?? ""}
                          onChange={e => setRates(prev => ({ ...prev, [svc.id]: e.target.value }))}
                          className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
                          style={{ color: "#0a2e30" }}
                        />
                        <span className="text-xs text-gray-400">{svc.unit}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── 4. Weekly Availability ── */}
          <Section title="Weekly Availability" subtitle="Set which days you work and your available hours.">
            <div className="space-y-2">
              {DAYS.map(day => {
                const slot = avail[day.id] ?? { available: true, start: "08:00", end: "18:00" };
                return (
                  <div
                    key={day.id}
                    className="flex flex-wrap items-center gap-4 rounded-xl border p-3.5 transition"
                    style={slot.available
                      ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,.04)" }
                      : { borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}
                  >
                    {/* Day toggle */}
                    <button
                      type="button"
                      onClick={() => setAvail(prev => ({
                        ...prev,
                        [day.id]: { ...slot, available: !slot.available },
                      }))}
                      className="flex items-center gap-3 min-w-[100px]"
                    >
                      <div
                        className="relative h-5 w-9 rounded-full transition-colors duration-200"
                        style={{ backgroundColor: slot.available ? "#00b096" : "#d1d5db" }}
                      >
                        <div
                          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                          style={{ transform: slot.available ? "translateX(16px)" : "translateX(2px)" }}
                        />
                      </div>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: slot.available ? "#0a2e30" : "#9ca3af" }}
                      >
                        {day.label}
                      </span>
                    </button>

                    {/* Hours (only when available) */}
                    {slot.available && (
                      <div className="ml-auto flex items-center gap-2 text-sm">
                        <span className="text-xs text-gray-400">From</span>
                        <input
                          type="time"
                          value={slot.start}
                          onChange={e => setAvail(prev => ({
                            ...prev,
                            [day.id]: { ...slot, start: e.target.value },
                          }))}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-[#00b096]"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={e => setAvail(prev => ({
                            ...prev,
                            [day.id]: { ...slot, end: e.target.value },
                          }))}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-[#00b096]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── 5. Gallery Photos ── */}
          <Section
            title="Photo Gallery"
            subtitle={`Show owners your home, yard, or previous happy clients. Up to ${MAX_GALLERY} photos.`}
          >
            <div className="grid grid-cols-3 gap-3">
              {gallery.map(url => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <img src={url} alt="Gallery" className="h-full w-full object-cover transition group-hover:opacity-80" />
                  <button
                    type="button"
                    onClick={() => deleteGalleryPhoto(url)}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-500"
                    title="Delete photo"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {gallery.length < MAX_GALLERY && (
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={galleryUploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 transition hover:border-[#00b096] hover:text-[#00b096] disabled:opacity-50"
                >
                  {galleryUploading ? (
                    <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-[11px] font-medium">Add photo</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGalleryChange}
            />

            <p className="mt-3 text-xs text-gray-400">
              {gallery.length}/{MAX_GALLERY} photos uploaded
            </p>
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
                <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#00b096" }}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Profile saved!
                </p>
              ) : (
                <p className="text-xs text-white/40">Changes are not saved automatically.</p>
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
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
