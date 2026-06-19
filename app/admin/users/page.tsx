"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";
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

type NotifyTarget = { id: string; name: string; email: string };

export default function AdminUsersPage() {
  const ready      = useAdminGuard();
  const [users,    setUsers]   = useState<UserRow[]>([]);
  const [loading,  setLoading] = useState(true);
  const [acting,   setActing]  = useState<string | null>(null);
  const [filter,   setFilter]  = useState<FilterKey>("all");
  const [search,   setSearch]  = useState("");

  const [notifyTarget,  setNotifyTarget]  = useState<NotifyTarget | null>(null);
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifySending, setNotifySending] = useState(false);
  const [notifyDone,    setNotifyDone]    = useState(false);

  useEffect(() => {
    if (!ready) return;
    async function load() {
      const res = await fetch("/api/admin/users");
      if (!res.ok) { setLoading(false); return; }
      const { users: usersRaw, providers } = await res.json();

      const providerMap = new Map((providers ?? []).map((p: { user_id: string; id: string; verified: boolean; active: boolean; rating_avg: number; review_count: number }) => [p.user_id, p]));
      const merged = (usersRaw ?? []).map((u: UserRow) => ({
        ...u,
        provider: u.role === "provider" ? (providerMap.get(u.id) ?? null) : null,
      }));
      setUsers(merged);
      setLoading(false);
    }
    load();
  }, [ready]);

  async function toggleField(providerId: string, field: "verified" | "active", current: boolean) {
    setActing(providerId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, field, value: !current }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u =>
        u.provider?.id === providerId
          ? { ...u, provider: { ...u.provider!, [field]: !current } }
          : u
      ));
    }
    setActing(null);
  }

  const toggleVerified = (providerId: string, current: boolean) => toggleField(providerId, "verified", current);
  const toggleSuspend  = (providerId: string, current: boolean) => toggleField(providerId, "active",   current);

  function openNotify(u: UserRow) {
    setNotifyTarget({ id: u.id, name: u.name, email: u.email });
    setNotifySubject("");
    setNotifyMessage("");
    setNotifyDone(false);
  }

  async function sendNotify() {
    if (!notifyTarget || !notifySubject.trim() || !notifyMessage.trim()) return;
    setNotifySending(true);
    const res = await fetch("/api/admin/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: notifyTarget.id, subject: notifySubject, message: notifyMessage }),
    });
    setNotifySending(false);
    if (res.ok) {
      setNotifyDone(true);
    }
  }

  const counts = {
    all:      users.length,
    owner:    users.filter(u => u.role === "owner").length,
    provider: users.filter(u => u.role === "provider").length,
  };

  const byRole  = filter === "all" ? users : users.filter(u => u.role === filter);
  const q       = search.trim().toLowerCase();
  const visible = q ? byRole.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : byRole;

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

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00b096]/30"
        />

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
                        ? { backgroundColor: "rgba(37,99,235,.1)", color: "#2563eb" }
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
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-50"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => openNotify(u)}
                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    Notify
                  </button>
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
                      <button
                        onClick={() => toggleSuspend(u.provider!.id, u.provider!.active)}
                        disabled={acting === u.provider.id}
                        className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition hover:opacity-80 disabled:opacity-40"
                        style={u.provider.active
                          ? { borderColor: "#fcd34d", color: "#b45309" }
                          : { borderColor: "#6ee7b7", color: "#059669" }
                        }
                      >
                        {acting === u.provider.id ? "…" : u.provider.active ? "Suspend" : "Unsuspend"}
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

      {/* Notify modal */}
      {notifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setNotifyTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold" style={{ color: "#0a2e30" }}>Notify User</h2>
            <p className="mt-0.5 text-xs text-gray-400">{notifyTarget.name} · {notifyTarget.email}</p>

            {notifyDone ? (
              <div className="mt-6 flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Message sent successfully</p>
                <button onClick={() => setNotifyTarget(null)} className="mt-1 text-xs text-gray-400 underline">Close</button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Subject"
                  value={notifySubject}
                  onChange={e => setNotifySubject(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
                />
                <textarea
                  placeholder="Message…"
                  rows={5}
                  value={notifyMessage}
                  onChange={e => setNotifyMessage(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
                  style={{ resize: "vertical" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotifyTarget(null)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendNotify}
                    disabled={notifySending || !notifySubject.trim() || !notifyMessage.trim()}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: "#00b096" }}
                  >
                    {notifySending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
