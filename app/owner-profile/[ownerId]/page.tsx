"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];
const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];
function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  size: "small" | "medium" | "large" | "xlarge" | null;
  age: number | null;
  vaccination_status: boolean;
  avatar_url: string | null;
};

const SIZE_LABEL: Record<string, string> = {
  small: "Small", medium: "Medium", large: "Large", xlarge: "XL",
};

type PageState = "loading" | "unauthorized" | "ready";

export default function OwnerProfileForProvider() {
  const router   = useRouter();
  const params   = useParams();
  const ownerId  = params.ownerId as string;

  const [state,     setState]     = useState<PageState>("loading");
  const [name,      setName]      = useState("");
  const [location,  setLocation]  = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dogs,      setDogs]      = useState<Dog[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // Must be a provider
      const { data: providerRow } = await sb
        .from("providers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!providerRow) { if (!cancelled) setState("unauthorized"); return; }

      // Must have at least one booking with this owner
      const { data: booking } = await sb
        .from("bookings")
        .select("id")
        .eq("provider_id", providerRow.id)
        .eq("owner_id", ownerId)
        .limit(1)
        .maybeSingle();

      if (!booking) { if (!cancelled) setState("unauthorized"); return; }

      // Fetch owner data + dogs
      const [{ data: u }, { data: dgs }] = await Promise.all([
        sb.from("users").select("name, location, avatar_url").eq("id", ownerId).single(),
        sb.from("dogs").select("id, name, breed, size, age, vaccination_status, avatar_url").eq("owner_id", ownerId).order("created_at"),
      ]);

      if (cancelled) return;
      const uRow = u as { name: string; location: string | null; avatar_url: string | null } | null;
      setName(uRow?.name ?? "");
      setLocation(uRow?.location ?? null);
      setAvatarUrl(uRow?.avatar_url ?? null);
      setDogs((dgs ?? []) as Dog[]);
      setState("ready");
    }
    load();
    return () => { cancelled = true; };
  }, [router, ownerId]);

  if (state === "loading") return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <p className="text-2xl font-bold text-white">Dog<span style={{ color: "#00b096" }}>Care</span>GH</p>
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading profile…</p>
    </div>
  );

  if (state === "unauthorized") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ backgroundColor: "#f8fafb" }}>
      <span className="mb-4 text-5xl">🔒</span>
      <h1 className="mb-2 text-xl font-extrabold" style={{ color: "#0a2e30" }}>Profile not accessible</h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        You can only view an owner&apos;s profile if you have an active or past booking with them.
      </p>
      <Link
        href="/dashboard/provider"
        className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: "#00b096" }}
      >
        Back to Dashboard
      </Link>
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
        <Link href="/" className="text-2xl font-bold tracking-tight text-white">
          Dog<span style={{ color: "#00b096" }}>Care</span>GH
        </Link>
        <Link
          href="/dashboard/provider"
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10"
        >
          ← Dashboard
        </Link>
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
                  style={{ backgroundColor: ownerId ? avatarBg(ownerId) : "#00b096" }}
                >
                  {ini(name)}
                </div>
              )}
              <div>
                <p className="text-xl font-extrabold" style={{ color: "#0a2e30" }}>{name || "—"}</p>
                <p className="mt-0.5 text-xs font-medium" style={{ color: "#00b096" }}>Pet Owner</p>
              </div>
            </div>

            {/* Location */}
            {location && (
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-base">📍</span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Location</p>
                  <p className="text-sm font-medium text-gray-700">{location}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dogs */}
        <div className="mt-6">
          <h2 className="mb-3 text-base font-extrabold" style={{ color: "#0a2e30" }}>
            {firstName ? `${firstName}'s Dogs` : "Dogs"}
          </h2>
          {dogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-400">
              <img src="/puppies.png" alt="" className="mx-auto mb-3 h-24 w-auto opacity-80" />
              No dogs on profile yet.
            </div>
          ) : (
            <div className="space-y-3">
              {dogs.map(dog => (
                <div key={dog.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  {dog.avatar_url ? (
                    <img src={dog.avatar_url} alt={dog.name} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: "rgba(0,176,150,0.1)" }}
                    >
                      🐕
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold" style={{ color: "#0a2e30" }}>{dog.name}</p>
                    <p className="text-xs text-gray-500">
                      {[dog.breed, dog.size ? SIZE_LABEL[dog.size] : null, dog.age ? `${dog.age}y` : null]
                        .filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={
                      dog.vaccination_status
                        ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                        : { background: "rgba(239,68,68,.1)", color: "#dc2626" }
                    }
                  >
                    {dog.vaccination_status ? "Vaccinated" : "Unvaccinated"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
