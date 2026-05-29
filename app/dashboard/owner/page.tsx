"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useChat } from "@/lib/chat-context";
import { NotificationsBell } from "@/components/notifications-bell";
import { useNotifications } from "@/lib/notifications-context";

// ── Types ──────────────────────────────────────────────────────────────────

type BookingStatus =
  | "pending" | "confirmed" | "paid"
  | "in_progress" | "completed_pending" | "closed" | "cancelled";

type ServiceId =
  | "dog_sitting" | "dog_daycare" | "dog_boarding"
  | "dog_grooming" | "dog_walking";

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  size: "small" | "medium" | "large" | "xlarge" | null;
  age: number | null;
  vaccination_status: boolean;
  avatar_url: string | null;
};

type Booking = {
  id: string;
  service_type: ServiceId;
  start_date: string;
  end_date: string;
  gross_amount: number;
  status: BookingStatus;
  created_at: string;
  providers:
    | { id: string; neighbourhood: string | null; avatar_url: string | null; user_id: string; users: { name: string } | { name: string }[] | null }
    | { id: string; neighbourhood: string | null; avatar_url: string | null; user_id: string; users: { name: string } | { name: string }[] | null }[]
    | null;
  dogs: { name: string } | { name: string }[] | null;
};

type Notification = {
  id: string;
  type: string;
  message: string;
  booking_id: string | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

const SERVICES: Record<ServiceId, { label: string; emoji: string }> = {
  dog_sitting:  { label: "Dog Sitting",  emoji: "🐾" },
  dog_daycare:  { label: "Dog Daycare",  emoji: "🏡" },
  dog_boarding: { label: "Dog Boarding", emoji: "🛏️" },
  dog_grooming: { label: "Dog Grooming", emoji: "✂️" },
  dog_walking:  { label: "Dog Walking",  emoji: "🦮" },
};

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string; desc: string }> = {
  pending:           { label: "Pending",            color: "#d97706", bg: "rgba(251,191,36,.12)", desc: "Waiting for provider to respond"         },
  confirmed:         { label: "Payment Due",        color: "#0891b2", bg: "rgba(8,145,178,.10)",  desc: "Provider accepted — pay now to confirm" },
  paid:              { label: "Paid",               color: "#059669", bg: "rgba(5,150,105,.10)",  desc: "Payment received, service upcoming"     },
  in_progress:       { label: "In Progress",        color: "#6366f1", bg: "rgba(99,102,241,.10)", desc: "Service is underway"                    },
  completed_pending: { label: "Confirm Completion", color: "#8b5cf6", bg: "rgba(139,92,246,.10)", desc: "Provider marked done — please confirm"  },
  closed:            { label: "Closed",             color: "#10b981", bg: "rgba(16,185,129,.10)", desc: "Service complete, payout released"      },
  cancelled:         { label: "Cancelled",          color: "#dc2626", bg: "rgba(220,38,38,.08)",  desc: "This booking was cancelled"             },
};

const TRACK_STEPS: BookingStatus[] = [
  "pending", "confirmed", "paid", "in_progress", "completed_pending", "closed",
];

type TabKey = "action" | "active" | "history" | "all";
const TABS: Array<{ key: TabKey; label: string; statuses: BookingStatus[] }> = [
  { key: "action",  label: "Action Needed", statuses: ["confirmed", "completed_pending"] },
  { key: "active",  label: "Active",        statuses: ["pending", "paid", "in_progress"] },
  { key: "history", label: "History",       statuses: ["closed", "cancelled"]            },
  { key: "all",     label: "All",           statuses: ["pending","confirmed","paid","in_progress","completed_pending","closed","cancelled"] },
];

const NOTIF_ICONS: Record<string, string> = {
  booking_confirmed:    "✅",
  booking_declined:     "❌",
  booking_cancelled:    "🚫",
  payment_received:     "💳",
  payment_confirmed:    "✅",
  service_started:      "🐾",
  awaiting_confirmation:"⏰",
  payout_triggered:     "💰",
};

const DOG_SIZES = ["small", "medium", "large", "xlarge"] as const;
const PALETTE   = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];

// ── Helpers ────────────────────────────────────────────────────────────────

const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

function ini(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function resolve<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function shortRef(id: string) { return id.replace(/-/g, "").slice(0, 8).toUpperCase(); }

// ── Status track ───────────────────────────────────────────────────────────

function StatusTrack({ status }: { status: BookingStatus }) {
  if (status === "cancelled") {
    return <span className="text-[11px] font-bold" style={{ color: "#dc2626" }}>✕ Cancelled</span>;
  }
  const idx = TRACK_STEPS.indexOf(status);
  return (
    <div className="flex items-center">
      {TRACK_STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="h-3 w-3 rounded-full" style={
            i < idx  ? { backgroundColor: "#00b096" }
            : i === idx ? { backgroundColor: "#0a2e30", outline: "2px solid #00b096", outlineOffset: "1px" }
            : { backgroundColor: "#e5e7eb" }
          }/>
          {i < TRACK_STEPS.length - 1 && (
            <div className="h-px w-4" style={{ backgroundColor: i < idx ? "#00b096" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Add Dog form ───────────────────────────────────────────────────────────

function AddDogForm({ ownerId, onAdded, onCancel }: {
  ownerId: string;
  onAdded: (dog: Dog) => void;
  onCancel: () => void;
}) {
  const [name,    setName]    = useState("");
  const [breed,   setBreed]   = useState("");
  const [age,     setAge]     = useState("");
  const [size,    setSize]    = useState<Dog["size"]>(null);
  const [vax,     setVax]     = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const sb = createClient();
    const { data, error: err } = await sb
      .from("dogs")
      .insert({
        owner_id:           ownerId,
        name:               name.trim(),
        breed:              breed.trim() || null,
        age:                age ? parseInt(age) : null,
        size:               size || null,
        vaccination_status: vax,
      })
      .select()
      .single();
    if (err || !data) { setError(err?.message ?? "Failed to add dog"); setSaving(false); return; }
    onAdded(data as Dog);
  }

  const INPUT = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20";

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-[#00b096]/20 bg-[#00b096]/04 p-4" style={{ backgroundColor: "rgba(0,176,150,.04)" }}>
      <p className="mb-3 text-sm font-bold" style={{ color: "#0a2e30" }}>Add a dog</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-500">Dog&apos;s name *</label>
          <input className={INPUT} placeholder="e.g. Brownie" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Breed</label>
          <input className={INPUT} placeholder="e.g. Labrador" value={breed} onChange={e => setBreed(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Age (years)</label>
          <input className={INPUT} type="number" min={0} max={30} placeholder="e.g. 3" value={age} onChange={e => setAge(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Size</label>
          <select className={INPUT} value={size ?? ""} onChange={e => setSize((e.target.value as Dog["size"]) || null)}>
            <option value="">Select size</option>
            {DOG_SIZES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input id="vax" type="checkbox" checked={vax} onChange={e => setVax(e.target.checked)} className="h-4 w-4 rounded accent-[#00b096]" />
          <label htmlFor="vax" className="text-xs font-semibold text-gray-600">Vaccinated</label>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={saving || !name.trim()}
          className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#00b096" }}>
          {saving ? "Saving…" : "Add Dog"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const router = useRouter();
  const { openChat } = useChat();
  const { notifications: bellNotifs } = useNotifications();

  // Booking IDs with unread message notifications — navigate to messages tab for these
  const unreadMsgBookings = useMemo(() =>
    new Set(bellNotifs.filter(n => n.type === "new_message" && !n.read && n.booking_id).map(n => n.booking_id!)),
  [bellNotifs]);

  const [ownerName,   setOwnerName]   = useState("");
  const [ownerAvatar, setOwnerAvatar] = useState<string | null>(null);
  const [ownerId,     setOwnerId]     = useState("");
  const [dogs,       setDogs]       = useState<Dog[]>([]);
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [notifs,     setNotifs]     = useState<Notification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<TabKey>("all");
  const [updating,   setUpdating]   = useState<string | null>(null);
  const [addingDog,  setAddingDog]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login?redirect=/dashboard/owner"); return; }

      const [{ data: u }, { data: dgs }, { data: bks }, { data: nf }] = await Promise.all([
        sb.from("users").select("name, avatar_url").eq("id", user.id).single(),
        sb.from("dogs").select("id, name, breed, age, size, vaccination_status, avatar_url").eq("owner_id", user.id).order("created_at"),
        sb.from("bookings")
          .select(`id, service_type, start_date, end_date, gross_amount, status, created_at,
            providers!provider_id(id, neighbourhood, avatar_url, user_id, users!user_id(name)),
            dogs!dog_id(name)`)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
        sb.from("notifications")
          .select("id, type, message, booking_id")
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;
      const uRow = u as { name: string; avatar_url: string | null } | null;
      setOwnerName(uRow?.name ?? "");
      setOwnerAvatar(uRow?.avatar_url ?? null);
      setOwnerId(user.id);
      setDogs((dgs ?? []) as Dog[]);
      setBookings((bks ?? []) as unknown as Booking[]);
      setNotifs((nf ?? []) as Notification[]);

      // Default to Action Needed if there are urgent items, otherwise All
      const actionCount = (bks ?? []).filter((b: { status: string }) =>
        b.status === "confirmed" || b.status === "completed_pending"
      ).length;
      setTab(actionCount > 0 ? "action" : "all");

      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  async function updateStatus(bookingId: string, status: BookingStatus) {
    setUpdating(bookingId);
    const sb = createClient();
    const { error } = await sb.from("bookings").update({ status }).eq("id", bookingId);
    if (!error) setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
    setUpdating(null);
  }

  async function handlePayment(bookingId: string) {
    setUpdating(bookingId);
    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        alert(data.error ?? "Could not start payment. Please try again.");
        setUpdating(null);
      }
    } catch {
      alert("Could not start payment. Please try again.");
      setUpdating(null);
    }
  }

  async function dismissNotif(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id));
    await createClient().from("notifications").update({ read: true }).eq("id", id);
  }

  async function dismissAll() {
    const ids = notifs.map(n => n.id);
    setNotifs([]);
    if (ids.length) await createClient().from("notifications").update({ read: true }).in("id", ids);
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const map: Record<TabKey, number> = { action: 0, active: 0, history: 0, all: 0 };
    bookings.forEach(b => {
      map.all++;
      TABS.forEach(t => { if (t.statuses.includes(b.status)) map[t.key]++; });
    });
    return map;
  }, [bookings]);

  const stats = useMemo(() => ({
    action:    bookings.filter(b => ["confirmed","completed_pending"].includes(b.status)).length,
    pending:   bookings.filter(b => b.status === "pending").length,
    active:    bookings.filter(b => ["paid","in_progress"].includes(b.status)).length,
    completed: bookings.filter(b => b.status === "closed").length,
  }), [bookings]);

  const visible = useMemo(() => {
    const allowed = TABS.find(t => t.key === tab)?.statuses ?? [];
    return bookings.filter(b => allowed.includes(b.status));
  }, [bookings, tab]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-12 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  const firstName = ownerName.split(" ")[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-12 w-auto" /></Link>
        <div className="flex items-center gap-3">
          <Link href="/search" className="hidden rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 sm:block">
            Find Providers
          </Link>
          <NotificationsBell />
          <Link href="/dashboard/owner/profile" className="flex items-center transition hover:opacity-80" title="My Profile">
            {ownerAvatar ? (
              <img src={ownerAvatar} alt={firstName} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/25" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white/25"
                style={{ backgroundColor: ownerId ? avatarBg(ownerId) : "#00b096" }}
              >
                {ini(firstName)}
              </div>
            )}
          </Link>
          <button
            onClick={async () => { await createClient().auth.signOut(); router.push("/"); }}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Hero / stats ── */}
      <div className="px-6 pb-10 pt-8 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>My Dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">
            {firstName ? `Welcome back, ${firstName}` : "Your Dashboard"}
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { label: "Action Needed", value: stats.action,    accent: "#f59e0b" },
              { label: "Pending",       value: stats.pending,   accent: "#60a5fa" },
              { label: "Active",        value: stats.active,    accent: "#00b096" },
              { label: "Completed",     value: stats.completed, accent: "#a78bfa" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: "rgba(255,255,255,.06)" }}>
                <p className="text-xs font-medium text-white/50">{s.label}</p>
                <p className="mt-1 text-xl font-extrabold sm:text-2xl" style={{ color: s.accent }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-8">

        {/* ── Notifications ── */}
        {notifs.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: "#0a2e30" }}>Notifications</h2>
              <button onClick={dismissAll} className="text-xs font-semibold transition hover:underline" style={{ color: "#00b096" }}>
                Dismiss all
              </button>
            </div>
            <div className="space-y-2">
              {notifs.map(n => (
                <div key={n.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <span className="text-lg leading-none">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
                  <p className="flex-1 text-sm leading-relaxed text-gray-700">{n.message}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {n.booking_id && (
                      <button
                        type="button"
                        onClick={() => openChat(n.booking_id!)}
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80"
                        style={{ backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }}
                      >
                        View
                      </button>
                    )}
                    <button onClick={() => dismissNotif(n.id)} className="text-gray-300 transition hover:text-gray-500" aria-label="Dismiss">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── My Dogs ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "#0a2e30" }}>
              My Dogs
              {dogs.length > 0 && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }}>
                  {dogs.length}
                </span>
              )}
            </h2>
            {!addingDog && (
              <button
                onClick={() => setAddingDog(true)}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#00b096" }}
              >
                + Add Dog
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {dogs.length === 0 && !addingDog ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="mb-2 text-4xl">🐕</span>
                <p className="text-sm font-semibold text-gray-600">No dogs yet</p>
                <p className="mt-1 mb-4 text-xs text-gray-400">Add your dog to start booking services</p>
                <button
                  onClick={() => setAddingDog(true)}
                  className="rounded-full px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "#00b096" }}
                >
                  Add your first dog
                </button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dogs.map(dog => (
                  <Link
                    key={dog.id}
                    href={`/dashboard/owner/dogs/${dog.id}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition hover:shadow-sm"
                    style={{ borderLeftWidth: 3, borderLeftColor: avatarBg(dog.id) }}
                  >
                    {dog.avatar_url ? (
                      <img src={dog.avatar_url} alt={dog.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
                        style={{ backgroundColor: avatarBg(dog.id) }}
                      >
                        {ini(dog.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold" style={{ color: "#0a2e30" }}>{dog.name}</p>
                      <p className="text-xs text-gray-400">
                        {[dog.breed, dog.size, dog.age != null ? `${dog.age}y` : null].filter(Boolean).join(" · ") || "No details"}
                      </p>
                    </div>
                    {dog.vaccination_status && (
                      <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(5,150,105,.12)", color: "#059669" }}>
                        ✓ Vax
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {addingDog && (
              <AddDogForm
                ownerId={ownerId}
                onAdded={dog => { setDogs(prev => [...prev, dog]); setAddingDog(false); }}
                onCancel={() => setAddingDog(false)}
              />
            )}
          </div>
        </section>

        {/* ── Bookings ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "#0a2e30" }}>Bookings</h2>
            <Link
              href="/search"
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              + New Booking
            </Link>
          </div>

          {/* Tab bar */}
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition"
                style={tab === t.key ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                    style={tab === t.key
                      ? { backgroundColor: "rgba(255,255,255,.18)", color: "#fff" }
                      : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
                  >
                    {counts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Empty state */}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
              <span className="mb-3 text-5xl">🐾</span>
              <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>
                {bookings.length === 0 ? "No bookings yet" :
                 tab === "action" ? "No actions needed right now" :
                 tab === "active" ? "No active bookings" : "No booking history yet"}
              </p>
              <p className="mt-1 mb-5 text-xs text-gray-400">
                {bookings.length === 0
                  ? "Find a trusted provider and book your first service."
                  : "Your bookings for this category will appear here."}
              </p>
              {(bookings.length === 0 || tab === "action" || tab === "active") && (
                <Link href="/search" className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: "#00b096" }}>
                  Find Providers
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map(b => {
                const provider     = resolve(b.providers);
                const providerUser = resolve(provider?.users);
                const providerFullName = providerUser?.name ?? "DogCare Provider";
                const providerName = providerFullName.split(" ")[0];
                const dogRow       = resolve(b.dogs);
                const svc          = SERVICES[b.service_type];
                const st           = STATUS_META[b.status];
                const sameDay      = b.start_date === b.end_date;
                const isBusy       = updating === b.id;

                return (
                  <article
                    key={b.id}
                    className="cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                    onClick={() => router.push(`/booking/${b.id}${unreadMsgBookings.has(b.id) ? "?tab=messages" : ""}`)}
                  >
                    <div className="p-5">

                      {/* Provider + status badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {provider?.avatar_url ? (
                            <img src={provider.avatar_url} alt={providerFullName} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                          ) : (
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                              style={{ backgroundColor: avatarBg(provider?.user_id ?? b.id) }}
                            >
                              {ini(providerFullName)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>{providerName}</p>
                            <p className="text-xs text-gray-400">
                              {[
                                dogRow?.name ? `🐕 ${dogRow.name}` : null,
                                provider?.neighbourhood ? `📍 ${provider.neighbourhood}` : null,
                              ].filter(Boolean).join("  ·  ")}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>

                      {/* Service + dates */}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>{svc?.emoji} {svc?.label}</span>
                        <span>📅 {sameDay ? fmtDate(b.start_date) : `${fmtShort(b.start_date)} → ${fmtDate(b.end_date)}`}</span>
                      </div>

                      {/* Status desc + amount */}
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                        <p className="text-xs text-gray-500">{st.desc}</p>
                        <p className="shrink-0 text-sm font-extrabold" style={{ color: "#0a2e30" }}>
                          GHS {Number(b.gross_amount).toFixed(2)}
                        </p>
                      </div>

                      {/* Progress track */}
                      <div className="mt-3 flex items-center justify-between">
                        <StatusTrack status={b.status} />
                        <span className="font-mono text-[10px] text-gray-300">#{shortRef(b.id)}</span>
                      </div>

                      {/* Interactive section — stops card-click propagation */}
                      <div onClick={e => e.stopPropagation()}>

                        {/* Message thread */}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => openChat(b.id)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Message Provider
                          </button>
                        </div>

                        {/* Actions */}
                        {b.status === "pending" && (
                          <div className="mt-4">
                            <button disabled={isBusy} onClick={() => updateStatus(b.id, "cancelled")}
                              className="w-full rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-50 disabled:opacity-50">
                              {isBusy ? "Cancelling…" : "Cancel Request"}
                            </button>
                          </div>
                        )}

                        {b.status === "confirmed" && (
                          <div className="mt-4 space-y-2">
                            <button disabled={isBusy} onClick={() => handlePayment(b.id)}
                              className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: "#00b096" }}>
                              {isBusy ? "Redirecting to Paystack…" : `💳  Pay Now — GHS ${Number(b.gross_amount).toFixed(2)}`}
                            </button>
                            <button disabled={isBusy} onClick={() => updateStatus(b.id, "cancelled")}
                              className="w-full rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-50 disabled:opacity-50">
                              Cancel booking
                            </button>
                          </div>
                        )}

                        {b.status === "paid" && provider && (
                          <div className="mt-4">
                            <Link href={`/provider/${provider.id}`}
                              className="flex w-full items-center justify-center rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
                              View Provider Profile
                            </Link>
                          </div>
                        )}

                        {b.status === "completed_pending" && (
                          <div className="mt-4 space-y-2">
                            <button disabled={isBusy} onClick={() => updateStatus(b.id, "closed")}
                              className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: "#00b096" }}>
                              {isBusy ? "Confirming…" : "✓  Confirm Service Complete"}
                            </button>
                            <p className="text-center text-xs text-gray-400">Confirming releases payment to the provider.</p>
                            <button disabled className="w-full cursor-not-allowed rounded-xl border border-amber-200 py-2 text-xs font-medium text-amber-500 opacity-50">
                              Raise a Dispute (coming soon)
                            </button>
                          </div>
                        )}

                        {b.status === "closed" && provider && (
                          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                            <span className="text-lg">⭐</span>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-emerald-700">Service complete!</p>
                              <p className="text-xs text-emerald-600">How was your experience with {providerName}?</p>
                            </div>
                            <Link href={`/provider/${provider.id}`}
                              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                              style={{ backgroundColor: "#00b096" }}>
                              Review
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
