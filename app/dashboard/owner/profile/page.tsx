"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#2563eb","#0284c7","#ec4899"];
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

export default function OwnerProfilePage() {
  const router = useRouter();

  const [userId,    setUserId]    = useState("");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState<string | null>(null);
  const [phone,     setPhone]     = useState<string | null>(null);
  const [location,  setLocation]  = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dogs,      setDogs]      = useState<Dog[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/owner/profile"); return; }

      const [{ data: u }, { data: dgs }] = await Promise.all([
        sb.from("users").select("name, phone, location, avatar_url").eq("id", user.id).single(),
        sb.from("dogs").select("id, name, breed, size, age, vaccination_status, avatar_url").eq("owner_id", user.id).order("created_at"),
      ]);

      if (cancelled) return;
      const uRow = u as { name: string; phone: string | null; location: string | null; avatar_url: string | null } | null;
      setUserId(user.id);
      setName(uRow?.name ?? "");
      setEmail(user.email ?? null);
      setPhone(uRow?.phone ?? null);
      setLocation(uRow?.location ?? null);
      setAvatarUrl(uRow?.avatar_url ?? null);
      setDogs((dgs ?? []) as Dog[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

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
        <Link
          href="/dashboard/owner"
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

            {/* Avatar + name row */}
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
                <p className="mt-0.5 text-xs font-medium" style={{ color: "#00b096" }}>Pet Owner</p>
              </div>
            </div>

            {/* Details */}
            <div className="mt-6 space-y-3">
              {email && (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-base">✉️</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-700">{email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">Only you</span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-base">📍</span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Location</p>
                    <p className="text-sm font-medium text-gray-700">{location}</p>
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
            </div>

            {/* Edit button */}
            <div className="mt-6">
              <Link
                href="/dashboard/owner/edit"
                className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#00b096" }}
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Dogs */}
        <div className="mt-6">
          <h2 className="mb-3 text-base font-extrabold" style={{ color: "#0a2e30" }}>
            My Dogs
          </h2>
          {dogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-400">
              <img src="/puppies.png" alt="" className="mx-auto mb-3 h-24 w-auto opacity-80" />
              No dogs added yet. Add your dog from the dashboard.
            </div>
          ) : (
            <div className="space-y-3">
              {dogs.map(dog => (
                <Link key={dog.id} href={`/dashboard/owner/dogs/${dog.id}`} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
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
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
