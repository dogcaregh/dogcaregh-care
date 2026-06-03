"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "provider" | "admin";
  phone: string | null;
  created_at: string;
  provider?: {
    id: string;
    verified: boolean;
    active: boolean;
    rating_avg: number;
    review_count: number;
  } | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type FilterKey = "all" | "owner" | "provider";

export default function AdminUsersPage() {
  const ready      = useAdminGuard();
  const params     = useSearchParams();
  const [users,    setUsers]   = useState<UserRow[]>([]);
  const [loading,  setLoading] = useState(true);
  const [acting,   setActing]  = useState<string | null>(null);
  const [filter,   setFilter]  = useState<FilterKey>((params.get("role") as FilterKey) ?? "all");

  useEffect(() => {
    if (!ready) return;
    async function load() {
      const sb = createClient();
      const [{ data: usersRaw }, { data: providers }] = await Promise.all([
        sb.from("users").select("id, name, email, role, phone, created_at").neq("role", "admin").order("created_at", { ascending: false }),
        sb.from("providers").select("id, user_id, verified, active, rating_avg, review_count"),
      ]);

      const providerMap = new Map((providers ?? []).map(p => [p.user_id, p]));
      const merged = (usersRaw ?? []).map(u => ({
        ...u,
        role: u.role as UserRow["role"],
        provider: u.role === "provider" ? (providerMap.get(u.id) ?? null) : null,
      }));
      setUsers(merged);
      setLoading(false);
    }
    load();
  }, [ready]);

  async function toggleVerified(providerId: string, current: boolean) {
    setActing(providerId);
    const sb = createClient();
    const { error } = await sb.from("providers").update({ verified: !current }).eq("id", providerId);
    if (!error) {
      setUsers(prev => prev.map(u =>
        u.provider?.id === providerId
          ? { ...u, provider: { ...u.provider!, verified: !current } }
          : u
      ));
    }
    setActing(null);
  }

  const counts = {
    all:      users.length,
    owner:    users.filter(u => u.role === "owner").length,
    provider: users.filter(u => u.role === "provider").length,
  };

  const visible = filter === "all" ? users : users.filter(u => u.role === filter);

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Users</h1>
        <p className="mt-1 text-sm text-white/50">{users.length} total · {counts.owner} owners · {counts.provider} providers</p>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-5">

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {(["all", "owner", "provider"] as FilterKey[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition"
              style={filter === f ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        {/* User list */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {visible.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: "#0a2e30" }}>{u.name}</p>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                      style={u.role === "provider"
                        ? { backgroundColor: "rgba(99,102,241,.1)", color: "#6366f1" }
                        : { backgroundColor: "rgba(0,176,150,.1)", color: "#00b096" }
                      }
                    >
                      {u.role}
                    </span>
                    {u.provider?.verified && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(16,185,129,.1)", color: "#10b981" }}>
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                  {u.provider && (
                    <p className="text-xs text-gray-400">
                      ★ {Number(u.provider.rating_avg).toFixed(1)} · {u.provider.review_count} reviews · {u.provider.active ? "Active" : "Inactive"}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-300">Joined {fmtDate(u.created_at)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {u.role === "provider" && u.provider && (
                    <>
                      <button
                        onClick={() => toggleVerified(u.provider!.id, u.provider!.verified)}
                        disabled={acting === u.provider.id}
                        className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition hover:opacity-80 disabled:opacity-40"
                        style={u.provider.verified
                          ? { borderColor: "#fca5a5", color: "#dc2626" }
                          : { borderColor: "#6ee7b7", color: "#059669" }
                        }
                      >
                        {acting === u.provider.id ? "…" : u.provider.verified ? "Unverify" : "Verify"}
                      </button>
                      <Link
                        href={`/provider/${u.provider.id}`}
                        target="_blank"
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-50"
                      >
                        Profile ↗
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}

            {visible.length === 0 && (
              <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
                <span className="mb-3 text-4xl">👤</span>
                <p className="text-sm text-gray-400">No users found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
