"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LocationPicker } from "@/components/location-picker";
import ImageCropModal from "@/components/image-crop-modal";
import { resolveCoords } from "@/lib/geocode";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────

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

      const [uRes, pRes] = await Promise.all([
        sb.from("users").select("name, phone").eq("id", user.id).single(),
        sb.from("providers")
          .select("id, bio, years_experience, neighbourhood, active, avatar_url, gallery_photos")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (!pRes.data) { router.replace("/register/provider"); return; }

      const u = uRes.data  as { name: string; phone: string | null } | null;
      const p = pRes.data as {
        id: string; bio: string | null; years_experience: number | null;
        neighbourhood: string | null; active: boolean;
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
    setSaving(true);
    setError(null);

    const sb = createClient();

    const coords = await resolveCoords(neighbourhood.trim());

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
          avatar_url:       avatarUrl,
          gallery_photos:   gallery,
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
        <img src="/weblogo.png" alt="DogCareGH" className="h-10 w-auto" />
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
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-8 w-auto" /></Link>
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

          {/* ── 3. Gallery Photos ── */}
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
