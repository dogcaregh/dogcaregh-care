"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserSnap = { name: string; email: string | null; phone: string | null };

type BookingSnap = {
  id: string;
  service_type: string;
  gross_amount: number;
  start_date: string;
  status: string;
  users: UserSnap | UserSnap[] | null;
  providers: { users: UserSnap | UserSnap[] | null } | { users: UserSnap | UserSnap[] | null }[] | null;
} | null;

type Dispute = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  booking_id: string;
  bookings: BookingSnap | BookingSnap[];
  users: UserSnap | UserSnap[] | null;
};

type ContactInfo = { name: string; email: string | null; phone: string | null; role: "Owner" | "Provider" };

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  service_not_delivered: "Service Not Delivered",
  provider_no_show:      "Provider No-Show",
  poor_service_quality:  "Poor Service Quality",
  property_damage:       "Property Damage",
  other:                 "Other",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:               { label: "Open",          color: "#d97706", bg: "rgba(251,191,36,.12)"  },
  under_review:       { label: "Under Review",  color: "#0891b2", bg: "rgba(8,145,178,.10)"   },
  resolved_no_action: { label: "No Action",     color: "#6b7280", bg: "rgba(107,114,128,.10)" },
  resolved_refund:    { label: "Refund Issued", color: "#059669", bg: "rgba(5,150,105,.10)"   },
  dismissed:          { label: "Dismissed",     color: "#9ca3af", bg: "rgba(156,163,175,.10)" },
};

const FILTERS = [
  { key: "open",               label: "Open"         },
  { key: "under_review",       label: "Under Review" },
  { key: "resolved_no_action", label: "No Action"    },
  { key: "resolved_refund",    label: "Refunded"     },
  { key: "dismissed",          label: "Dismissed"    },
  { key: "all",                label: "All"          },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveArr<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortRef(id: string) { return id.replace(/-/g, "").slice(0, 8).toUpperCase(); }

// ─── Contact popup ────────────────────────────────────────────────────────────

function ContactPopup({ contact, onClose }: { contact: ContactInfo; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-base font-extrabold" style={{ color: "#0a2e30" }}>{contact.name}</p>
            <span
              className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: contact.role === "Owner" ? "rgba(37,99,235,.12)" : "rgba(0,176,150,.12)", color: contact.role === "Owner" ? "#2563eb" : "#00b096" }}
            >
              {contact.role}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {contact.email && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-base">✉️</span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Email</p>
                <a
                  href={`mailto:${contact.email}`}
                  className="truncate text-sm font-semibold transition hover:underline"
                  style={{ color: "#0a2e30" }}
                >
                  {contact.email}
                </a>
              </div>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-base">📞</span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Phone</p>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm font-semibold transition hover:underline"
                  style={{ color: "#0a2e30" }}
                >
                  {contact.phone}
                </a>
              </div>
            </div>
          )}

          {!contact.email && !contact.phone && (
            <p className="text-center text-sm text-gray-400">No contact details on file.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDisputesPage() {
  const ready = useAdminGuard();
  const [rows,    setRows]    = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<typeof FILTERS[number]["key"]>("open");
  const [acting,  setActing]  = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [contact, setContact] = useState<ContactInfo | null>(null);

  useEffect(() => {
    if (!ready) return;
    load(filter);
  }, [ready, filter]);

  async function load(status: string) {
    setLoading(true);
    const res  = await fetch(`/api/admin/disputes?status=${status}`);
    const data = res.ok ? await res.json() : { disputes: [] };
    setRows(data.disputes ?? []);
    setLoading(false);
  }

  async function act(id: string, status: string) {
    setActing(id);
    const res = await fetch("/api/admin/disputes", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, status, admin_note: noteMap[id] ?? "" }),
    });
    if (res.ok) setRows(prev => prev.filter(r => r.id !== id));
    setActing(null);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      {contact && <ContactPopup contact={contact} onClose={() => setContact(null)} />}

      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <h1 className="mb-1 text-2xl font-extrabold" style={{ color: "#0a2e30" }}>Disputes</h1>
        <p className="mb-6 text-sm text-gray-500">Review and resolve booking disputes raised by owners.</p>

        {/* Filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition"
              style={filter === f.key
                ? { backgroundColor: "#0a2e30", color: "#fff" }
                : { backgroundColor: "#e5e7eb", color: "#6b7280" }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
            <span className="mb-3 block text-4xl">🕊️</span>
            <p className="text-sm font-semibold text-gray-500">No disputes in this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(d => {
              const booking   = resolveArr(d.bookings as BookingSnap | BookingSnap[]);
              const ownerSnap = resolveArr(booking?.users as UserSnap | UserSnap[] | null);
              const provSnap  = resolveArr(booking?.providers as { users: UserSnap | UserSnap[] | null } | { users: UserSnap | UserSnap[] | null }[] | null);
              const provUser  = resolveArr(provSnap?.users as UserSnap | UserSnap[] | null);
              const ownerName = ownerSnap?.name ?? "Unknown";
              const provName  = provUser?.name ?? "Unknown";
              const sm        = STATUS_META[d.status] ?? STATUS_META.open;
              const isActing  = acting === d.id;
              const isActionable = d.status === "open" || d.status === "under_review";

              return (
                <div key={d.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="p-5">

                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>
                          {REASON_LABELS[d.reason] ?? d.reason}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Owner:{" "}
                          <button
                            onClick={() => setContact({ name: ownerName, email: ownerSnap?.email ?? null, phone: ownerSnap?.phone ?? null, role: "Owner" })}
                            className="font-semibold transition hover:underline"
                            style={{ color: "#2563eb" }}
                          >
                            {ownerName}
                          </button>
                          {" · "}
                          Provider:{" "}
                          <button
                            onClick={() => setContact({ name: provName, email: provUser?.email ?? null, phone: provUser?.phone ?? null, role: "Provider" })}
                            className="font-semibold transition hover:underline"
                            style={{ color: "#00b096" }}
                          >
                            {provName}
                          </button>
                          {" · "}
                          {fmtDate(d.created_at)}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ backgroundColor: sm.bg, color: sm.color }}
                      >
                        {sm.label}
                      </span>
                    </div>

                    {/* Booking info */}
                    {booking && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          onClick={e => e.stopPropagation()}
                          className="font-mono font-bold transition hover:underline"
                          style={{ color: "#0a2e30" }}
                        >
                          #{shortRef(booking.id)}
                        </Link>
                        <span>📅 {new Date(booking.start_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>GHS {Number(booking.gross_amount).toFixed(2)}</span>
                        <span className="capitalize">{booking.service_type?.replace(/_/g, " ")}</span>
                      </div>
                    )}

                    {/* Owner description */}
                    {d.description && (
                      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Owner&apos;s description</p>
                        <p className="text-sm leading-relaxed text-gray-700">{d.description}</p>
                      </div>
                    )}

                    {/* Admin note (resolved) */}
                    {d.admin_note && !isActionable && (
                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-400">Admin note</p>
                        <p className="text-sm leading-relaxed text-blue-700">{d.admin_note}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {isActionable && (
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={noteMap[d.id] ?? ""}
                          onChange={e => setNoteMap(prev => ({ ...prev, [d.id]: e.target.value }))}
                          placeholder="Admin note (optional — shown to owner on resolution)"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
                        />
                        <div className="flex flex-wrap gap-2">
                          {d.status === "open" && (
                            <button
                              disabled={isActing}
                              onClick={() => act(d.id, "under_review")}
                              className="rounded-xl border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                            >
                              Mark Under Review
                            </button>
                          )}
                          <button
                            disabled={isActing}
                            onClick={() => act(d.id, "resolved_no_action")}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            Resolve — No Action
                          </button>
                          <button
                            disabled={isActing}
                            onClick={() => act(d.id, "resolved_refund")}
                            className="rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "#059669" }}
                          >
                            Resolve — Refund Issued
                          </button>
                          <button
                            disabled={isActing}
                            onClick={() => act(d.id, "dismissed")}
                            className="rounded-xl border border-red-100 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Resolved timestamp */}
                    {d.resolved_at && (
                      <p className="mt-3 text-[11px] text-gray-400">Resolved {fmtDate(d.resolved_at)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
