"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LocationPicker } from "@/components/location-picker";
import ImageCropModal from "@/components/image-crop-modal";
import { resolveCoords } from "@/lib/geocode";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_GALLERY = 6;

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#2563eb","#0284c7","#ec4899"];

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

function Section({ id, title, subtitle, children }: {
  id?: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div id={id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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

  // Availability
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [bdViewYear,   setBdViewYear]   = useState(new Date().getFullYear());
  const [bdViewMonth,  setBdViewMonth]  = useState(new Date().getMonth());

  // Payout
  const [momoNetwork, setMomoNetwork] = useState("");
  const [momoNumber,  setMomoNumber]  = useState("");

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
  const [cropSrc,          setCropSrc]          = useState<string | null>(null);

  const avatarInputRef  = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Load existing data ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/provider/edit"); return; }

      const provRes = await fetch("/api/dashboard/provider");
      if (!provRes.ok) { router.replace("/register/provider"); return; }
      const { provider: pData } = await provRes.json();
      if (!pData) { router.replace("/register/provider"); return; }

      const p = pData as {
        id: string; bio: string | null; years_experience: number | null;
        neighbourhood: string | null; active: boolean;
        avatar_url: string | null; gallery_photos: string[];
        momo_network: string | null; momo_number: string | null;
        users: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null;
      };
      const pUser = Array.isArray(p.users) ? p.users[0] : p.users;

      setUserId(user.id);
      setProviderId(p.id);
      setName(pUser?.name ?? "");
      setPhone(pUser?.phone ?? "");
      setBio(p.bio ?? "");
      setNeighbourhood(p.neighbourhood ?? "");
      setYearsExp(p.years_experience ?? "");
      setActive(p.active);
      setBlockedDates((p as unknown as { blocked_dates?: string[] }).blocked_dates ?? []);
      setMomoNetwork(p.momo_network ?? "");
      setMomoNumber(p.momo_number ?? "");
      setAvatarUrl(p.avatar_url);
      setGallery(p.gallery_photos ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function uploadAvatarBlob(blob: Blob) {
    setCropSrc(null);
    setAvatarUploading(true);
    const sb   = createClient();
    const path = `${userId}/avatar_${Date.now()}.jpg`;
    const { error: upErr } = await sb.storage.from("provider-photos").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (!upErr) {
      const { data: { publicUrl } } = sb.storage.from("provider-photos").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      setAvatarPreview(null);
    } else {
      setError(`Photo upload failed: ${upErr.message}`);
    }
    setAvatarUploading(false);
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
      } else {
        setError(`Gallery upload failed: ${upErr.message}`);
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

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const stripped = trimmedPhone.replace(/[\s\-()+]/g, "");
      if (!/^(0\d{9}|233\d{9})$/.test(stripped)) {
        setError("Enter a valid Ghanaian phone number (e.g. 024 123 4567).");
        return;
      }
    }

    const trimmedMomo = momoNumber.trim();
    if (trimmedMomo) {
      const stripped = trimmedMomo.replace(/[\s\-()+]/g, "");
      if (!/^(0\d{9}|233\d{9})$/.test(stripped)) {
        setError("Enter a valid Ghanaian mobile money number (e.g. 024 123 4567).");
        return;
      }
    }

    setSaving(true);
    setError(null);

    const sb = createClient();

    const coords = await resolveCoords(neighbourhood.trim());

    const today = new Date().toISOString().split("T")[0];
    const futureDates = blockedDates.filter(d => d >= today);

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
          momo_network:     momoNetwork || null,
          momo_number:      momoNumber.trim() || null,
          avatar_url:       avatarUrl,
          gallery_photos:   gallery,
          blocked_dates:    futureDates,
          lat:              coords?.lat ?? null,
          lng:              coords?.lng ?? null,
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
        <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
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
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/provider"
            className="text-xs font-medium text-white/60 transition hover:text-white"
          >
            ← Dashboard
          </Link>
          <Link
            href="/dashboard/provider/services"
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            My Services
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

          {/* ── 3. Availability ── */}
          {(() => {
            const today     = new Date().toISOString().split("T")[0];
            const pad       = (n: number) => String(n).padStart(2, "0");
            const toStr     = (d: number) => `${bdViewYear}-${pad(bdViewMonth + 1)}-${pad(d)}`;
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const firstOfMonth  = useMemo(() => new Date(bdViewYear, bdViewMonth, 1), [bdViewYear, bdViewMonth]);
            const daysInMonth   = new Date(bdViewYear, bdViewMonth + 1, 0).getDate();
            const startOffset   = (firstOfMonth.getDay() + 6) % 7;
            const monthLabel    = firstOfMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
            const cells: (string | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toStr(i + 1))];
            while (cells.length % 7 !== 0) cells.push(null);
            function prevMonth() {
              if (bdViewMonth === 0) { setBdViewYear(y => y - 1); setBdViewMonth(11); }
              else setBdViewMonth(m => m - 1);
            }
            function nextMonth() {
              if (bdViewMonth === 11) { setBdViewYear(y => y + 1); setBdViewMonth(0); }
              else setBdViewMonth(m => m + 1);
            }
            function toggleDate(ds: string) {
              setBlockedDates(prev =>
                prev.includes(ds) ? prev.filter(d => d !== ds) : [...prev, ds].sort()
              );
            }
            const futureBlocked = blockedDates.filter(d => d >= today);
            return (
              <Section title="Availability" subtitle="Mark dates you are not available. Owners cannot select blocked dates when booking.">
                <div className="mb-3 flex items-center justify-between">
                  <button type="button" onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100">‹</button>
                  <span className="text-sm font-bold" style={{ color: "#0a2e30" }}>{monthLabel}</span>
                  <button type="button" onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100">›</button>
                </div>
                <div className="mb-1 grid grid-cols-7 text-center">
                  {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
                    <span key={d} className="text-[10px] font-semibold text-gray-400">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                  {cells.map((ds, i) => {
                    if (!ds) return <div key={`e-${i}`} />;
                    const isPast    = ds < today;
                    const isBlocked = blockedDates.includes(ds);
                    const isToday   = ds === today;
                    return (
                      <button
                        key={ds}
                        type="button"
                        disabled={isPast}
                        onClick={() => toggleDate(ds)}
                        className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition"
                        style={
                          isBlocked
                            ? { backgroundColor: "rgba(220,38,38,.15)", color: "#dc2626", fontWeight: 700 }
                            : isPast
                            ? { color: "#d1d5db", cursor: "not-allowed" }
                            : isToday
                            ? { border: "2px solid #00b096", color: "#0a2e30", fontWeight: 600 }
                            : { color: "#374151" }
                        }
                      >
                        {parseInt(ds.split("-")[2])}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                  <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-red-200" />Unavailable</span>
                  <span><span className="mr-1 inline-block h-3 w-3 rounded-full border-2 border-[#00b096]" />Today</span>
                </div>
                {futureBlocked.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold text-gray-500">
                      {futureBlocked.length} date{futureBlocked.length !== 1 ? "s" : ""} blocked — click to unblock
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {futureBlocked.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setBlockedDates(prev => prev.filter(x => x !== d))}
                          className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-500 transition hover:bg-red-100"
                        >
                          {new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            );
          })()}

          {/* ── 4. Payout Details ── */}
          <Section
            id="payout"
            title="Payout Details"
            subtitle="Where we send your earnings. DogCareGH pays out via mobile money."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Mobile Money Network</label>
                <select
                  className={INPUT}
                  value={momoNetwork}
                  onChange={e => setMomoNetwork(e.target.value)}
                >
                  <option value="">Select network…</option>
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="vodafone">Telecel Cash (Vodafone)</option>
                  <option value="airtel_tigo">AirtelTigo Money</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Mobile Money Number</label>
                <input
                  className={INPUT}
                  type="tel"
                  placeholder="024 000 0000"
                  value={momoNumber}
                  onChange={e => setMomoNumber(e.target.value)}
                />
              </div>
            </div>
            {momoNetwork && momoNumber && (
              <p className="mt-3 text-xs text-gray-400">
                Payouts will be sent to <strong className="text-gray-600">{momoNumber}</strong> via{" "}
                {{ mtn: "MTN Mobile Money", vodafone: "Telecel Cash", airtel_tigo: "AirtelTigo Money" }[momoNetwork] ?? momoNetwork}.
              </p>
            )}
          </Section>

          {/* ── 4. Gallery Photos ── */}
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

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onDone={uploadAvatarBlob}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
