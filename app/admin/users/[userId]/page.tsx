"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
};

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  age: number | null;
  vaccination_status: boolean;
  neutered: boolean | null;
  leash_trained: boolean | null;
  temperament: string[] | null;
  diet_preference: string | null;
  allergies: string[] | null;
  bio: string | null;
  avatar_url: string | null;
};

const SIZE_LABEL: Record<string, string> = { small: "Small", medium: "Medium", large: "Large", xlarge: "XL" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtAge(months: number | null) {
  if (months == null) return null;
  if (months < 12) return `${months}mo`;
  const yrs = Math.floor(months / 12);
  const mo  = months % 12;
  return mo === 0 ? `${yrs}yr${yrs > 1 ? "s" : ""}` : `${yrs}yr ${mo}mo`;
}

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#2563eb"];
const avatarBg = (s: string | null) => s ? PALETTE[s.charCodeAt(0) % PALETTE.length] : PALETTE[0];
const ini = (name: string | null) => name ? name.trim().split(/\s+/).map(w => w[0] ?? "").slice(0, 2).join("").toUpperCase() || "?" : "?";

export default function AdminUserDetailPage() {
  const ready = useAdminGuard();
  const router = useRouter();
  const { userId } = useParams<{ userId: string }>();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !userId) return;
    fetch(`/api/admin/users/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push("/admin/users"); return; }
        setUser(data.user);
        setDogs(data.dogs);
        setLoading(false);
      });
  }, [ready, userId, router]);

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 transition hover:text-white/80">
          ← All Users
        </Link>
        <div className="flex items-center gap-4">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name ?? ""} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{ backgroundColor: avatarBg(user.name) }}>
              {ini(user.name)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white">{user.name ?? "—"}</h1>
            <p className="text-sm text-white/50 capitalize">{user.role} · Joined {fmtDate(user.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 md:px-8">

        {/* Contact info */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Contact</p>
          <div className="space-y-1.5 text-sm">
            <p><span className="text-gray-400">Email</span> <span className="ml-2 font-medium" style={{ color: "#0a2e30" }}>{user.email}</span></p>
            <p><span className="text-gray-400">Phone</span> <span className="ml-2 font-medium" style={{ color: "#0a2e30" }}>{user.phone ?? "—"}</span></p>
            <p><span className="text-gray-400">Location</span> <span className="ml-2 font-medium" style={{ color: "#0a2e30" }}>{user.location ?? "—"}</span></p>
          </div>
        </div>

        {/* Dogs */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1">
            Dogs ({dogs.length})
          </p>
          {dogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
              <p className="text-sm text-gray-400">No dogs registered.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dogs.map(dog => (
                <div key={dog.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    {dog.avatar_url ? (
                      <img src={dog.avatar_url} alt={dog.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl bg-gray-100">🐕</div>
                    )}
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>{dog.name}</p>
                      <p className="text-xs text-gray-400">
                        {[dog.breed, dog.size ? SIZE_LABEL[dog.size] : null, fmtAge(dog.age)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                    <span><span className="text-gray-400">Vaccinated</span> <span className="ml-1 font-semibold" style={{ color: dog.vaccination_status ? "#059669" : "#dc2626" }}>{dog.vaccination_status ? "Yes" : "No"}</span></span>
                    {dog.neutered != null && <span><span className="text-gray-400">Neutered</span> <span className="ml-1 font-semibold" style={{ color: "#0a2e30" }}>{dog.neutered ? "Yes" : "No"}</span></span>}
                    {dog.leash_trained != null && <span><span className="text-gray-400">Leash trained</span> <span className="ml-1 font-semibold" style={{ color: "#0a2e30" }}>{dog.leash_trained ? "Yes" : "No"}</span></span>}
                    {dog.diet_preference && <span><span className="text-gray-400">Diet</span> <span className="ml-1 font-semibold capitalize" style={{ color: "#0a2e30" }}>{dog.diet_preference.replace("_", " ")}</span></span>}
                  </div>

                  {dog.temperament && dog.temperament.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {dog.temperament.map(t => (
                        <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium capitalize text-gray-600">{t}</span>
                      ))}
                    </div>
                  )}
                  {dog.allergies && dog.allergies.length > 0 && (
                    <p className="mt-2 text-xs text-amber-700">⚠️ Allergies: {dog.allergies.join(", ")}</p>
                  )}
                  {dog.bio && (
                    <p className="mt-2 text-xs text-gray-500 leading-relaxed">{dog.bio}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
