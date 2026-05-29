"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];
const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];
function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProviderProfilePage() {
  const router = useRouter();

  const [userId,       setUserId]       = useState("");
  const [providerId,   setProviderId]   = useState("");
  const [name,         setName]         = useState("");
  const [phone,        setPhone]        = useState<string | null>(null);
  const [neighbourhood, setNeighbourhood] = useState<string | null>(null);
  const [bio,          setBio]          = useState<string | null>(null);
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null);
  const [active,       setActive]       = useState(true);
  const [toggling,     setToggling]     = useState(false);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/provider/profile"); return; }

      const [{ data: u }, { data: p }] = await Promise.all([
        sb.from("users").select("name, phone").eq("id", user.id).single(),
        sb.from("providers").select("id, active, bio, neighbourhood, avatar_url").eq("user_id", user.id).single(),
      ]);

      if (cancelled) return;
      const uRow = u as { name: string; phone: string | null } | null;
      const pRow = p as { id: string; active: boolean; bio: string | null; neighbourhood: string | null; avatar_url: string | null } | null;

      setUserId(user.id);
      setName(uRow?.name ?? "");
      setPhone(uRow?.phone ?? null);
      setProviderId(pRow?.id ?? "");
      setActive(pRow?.active ?? true);
      setBio(pRow?.bio ?? null);
      setNeighbourhood(pRow?.neighbourhood ?? null);
setAvatarUrl(pRow?.avatar_url ?? null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  async function handleToggle() {
    if (!providerId || toggling) return;
    setToggling(true);
    const newActive = !active;
    setActive(newActive);
    const sb = createClient();
    const { error } = await sb.from("providers").update({ active: newActive }).eq("id", providerId);
    if (error) { setActive(!newActive); }
    setToggling(false);
  }

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading profile…</p>
    </div>
  );

  const firstName = name.split(" ")[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* Nav */}
      <nav
        className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <div className="flex items-center gap-3">
          {providerId && (
            <Link
              href={`/provider/${providerId}`}
              className="hidden rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 sm:block"
            >
              Public Profile
            </Link>
          )}
          <Link
            href="/dashboard/provider"
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10"
          >
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">

        {/* Profile card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-2" style={{ backgroundColor: "#00b096" }} />
          <div className="p-6">

            {/* Avatar + name */}
            <div className="flex items-center gap-5">
              {avatarUrl ? (
                <img src={avatarUrl} alt={firstName} className="h-20 w-20 rounded-2xl object-cover shadow" />
              ) : (
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow"
                  style={{ backgroundColor: userId ? avatarBg(userId) : "#00b096" }}
                >
                  {ini(name)}
                </div>
              )}
              <div>
                <p className="text-xl font-extrabold" style={{ color: "#0a2e30" }}>{name || "—"}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs font-medium" style={{ color: "#00b096" }}>Pet Care Provider</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={
                      active
                        ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                        : { background: "rgba(239,68,68,.1)", color: "#dc2626" }
                    }
                  >
                    {active ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="mt-6 space-y-3">
              {neighbourhood && (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-base">📍</span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Location</p>
                    <p className="text-sm font-medium text-gray-700">{neighbourhood}</p>
                  </div>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-base">📞</span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-gray-700">{phone}</p>
                  </div>
                </div>
              )}
              {bio && (
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">About</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-700">{bio}</p>
                </div>
              )}
            </div>

            {/* Availability toggle */}
            <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>Open for bookings</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {active
                    ? "Visible in search · accepting bookings"
                    : "Hidden from search · not accepting bookings"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                disabled={toggling}
                className="relative ml-4 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60"
                style={{ backgroundColor: active ? "#00b096" : "#d1d5db" }}
                aria-label="Toggle availability"
              >
                <span
                  className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: active ? "translateX(16px)" : "translateX(0)" }}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/provider/edit"
                className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#00b096" }}
              >
                Edit Profile
              </Link>
              <Link
                href="/dashboard/provider/services"
                className="inline-block rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                My Services
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
