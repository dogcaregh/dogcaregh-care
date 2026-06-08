"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LocationPicker } from "@/components/location-picker";
import ImageCropModal from "@/components/image-crop-modal";
import { resolveCoords } from "@/lib/geocode";

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:bg-white focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#2563eb","#0284c7","#ec4899"];
const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];
function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

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

function Spinner({ cls = "h-4 w-4" }: { cls?: string }) {
  return (
    <svg className={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function OwnerEditPage() {
  const router = useRouter();

  const [userId,   setUserId]   = useState("");
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [cropSrc,         setCropSrc]         = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/owner/edit"); return; }

      const { data: u } = await sb
        .from("users")
        .select("name, phone, location, avatar_url")
        .eq("id", user.id)
        .single();

      setUserId(user.id);
      const row = u as { name: string; phone: string | null; location: string | null; avatar_url: string | null } | null;
      setName(row?.name ?? "");
      setPhone(row?.phone ?? "");
      setLocation(row?.location ?? "");
      setAvatarUrl(row?.avatar_url ?? null);
      setLoading(false);
    }
    load();
  }, [router]);

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
    const { error: upErr } = await sb.storage.from("owner-photos").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (!upErr) {
      const { data: { publicUrl } } = sb.storage.from("owner-photos").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      setAvatarPreview(null);
    } else {
      setError(`Photo upload failed: ${upErr.message}`);
    }
    setAvatarUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const stripped = trimmedPhone.replace(/[\s\-()+]/g, "");
      if (!/^(0\d{9}|233\d{9})$/.test(stripped)) {
        setError("Enter a valid Ghanaian phone number (e.g. 024 123 4567).");
        return;
      }
    }

    setSaving(true);
    setError(null);

    const sb = createClient();
    const coords = await resolveCoords(location.trim());
    const { error: dbErr } = await sb
      .from("users")
      .update({
        name:       name.trim(),
        phone:      phone.trim() || null,
        location:   location.trim() || null,
        avatar_url: avatarUrl,
        lat:        coords?.lat ?? null,
        lng:        coords?.lng ?? null,
      })
      .eq("id", userId);

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
        <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
        <p className="mt-3 animate-pulse text-sm text-white/50">Loading profile…</p>
      </div>
    );
  }

  const displayAvatar = avatarPreview ?? avatarUrl;
  const firstName = name.split(" ")[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <Link
          href="/dashboard/owner"
          className="text-xs font-medium text-white/60 transition hover:text-white"
        >
          ← Dashboard
        </Link>
      </nav>

      {/* ── Header band ── */}
      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
          Account Settings
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">Edit Your Profile</h1>
        <p className="mt-1 text-sm text-white/50">
          Keep your details up to date so providers know who they&apos;re working with.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 pb-32 md:px-8">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
              <span className="text-lg">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-500">✕</button>
            </div>
          )}

          {/* ── 1. Profile Photo ── */}
          <Section title="Profile Photo" subtitle="Shown to providers in your bookings and messages.">
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
                    <Spinner cls="h-6 w-6 text-white" />
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
          <Section
            title="Personal Details"
            subtitle="Your first name is shown to providers. Phone and location are private."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL}>
                  Full Name
                  {firstName && (
                    <span className="ml-2 font-normal text-gray-400">
                      — shown as <strong className="text-gray-600">{firstName}</strong>
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
                <label className={LABEL}>
                  Area / Neighbourhood
                  <span className="ml-1 font-normal text-gray-400">(private)</span>
                </label>
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g. East Legon"
                  datalistId="owner-location-areas"
                />
              </div>
            </div>
          </Section>
        </div>

        {/* ── Sticky save bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white px-6 py-4 shadow-lg md:px-12">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            {saved ? (
              <p className="text-sm font-semibold" style={{ color: "#00b096" }}>
                ✓ Changes saved
              </p>
            ) : (
              <p className="text-xs text-gray-400">Changes are saved immediately.</p>
            )}
            <button
              type="submit"
              disabled={saving || avatarUploading}
              className="flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#00b096" }}
            >
              {saving && <Spinner cls="h-3.5 w-3.5 text-white" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
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
