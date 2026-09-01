"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";

// ─── Types ────────────────────────────────────────────────────────────────────

type VerificationDocs = {
  ghana_card_number:  string;
  legal_name:         string;
  address:            string;
  address_proof_type: string;
  ref1_name:          string;
  ref1_phone:         string;
  ref2_name:          string;
  ref2_phone:         string;
  applying_level2:    boolean;
  notes:              string | null;
  submitted_at:       string;
};

type ProviderRow = {
  id: string;
  verification_status: string;
  provider_level: number;
  verification_docs: VerificationDocs | null;
  verification_note: string | null;
  verified_at: string | null;
  created_at: string;
  users: { name: string; email: string; phone: string | null } | { name: string; email: string; phone: string | null }[] | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ADDRESS_PROOF_LABELS: Record<string, string> = {
  utility_bill:        "Utility Bill",
  tenancy_agreement:   "Tenancy Agreement",
  assembly_member:     "Assembly Member Note",
  other:               "Other",
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  unsubmitted: { label: "Not Applied",    color: "#9ca3af", bg: "rgba(156,163,175,.10)" },
  pending:     { label: "Pending Review", color: "#d97706", bg: "rgba(251,191,36,.12)"  },
  approved:    { label: "Approved",       color: "#10b981", bg: "rgba(16,185,129,.10)"  },
  rejected:    { label: "Rejected",       color: "#dc2626", bg: "rgba(220,38,38,.08)"   },
};

const FILTERS = ["pending", "approved", "rejected", "unsubmitted", "all"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveArr<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminVerificationPage() {
  const ready = useAdminGuard();
  const [rows,     setRows]     = useState<ProviderRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<typeof FILTERS[number]>("pending");
  const [acting,   setActing]   = useState<string | null>(null);
  const [noteMap,  setNoteMap]  = useState<Record<string, string>>({});
  const [levelMap, setLevelMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ready) return;
    load(filter);
  }, [ready, filter]);

  async function load(status: string) {
    setLoading(true);
    const res  = await fetch(`/api/admin/verification?status=${status}`);
    const data = res.ok ? await res.json() : { providers: [] };
    setRows(data.providers ?? []);
    setLoading(false);
  }

  async function upgrade(id: string) {
    setActing(id);
    const res = await fetch("/api/admin/verification", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, action: "upgrade", note: noteMap[id] ?? "" }),
    });
    if (res.ok) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, provider_level: 2 } : r));
    }
    setActing(null);
  }

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    const res = await fetch("/api/admin/verification", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id,
        action,
        level: levelMap[id] ?? 1,
        note:  noteMap[id] ?? "",
      }),
    });
    if (res.ok) {
      setRows(prev => prev.map(r =>
        r.id === id
          ? { ...r, verification_status: action === "approve" ? "approved" : "rejected" }
          : r
      ));
    }
    setActing(null);
  }

  const pendingCount = rows.filter(r => r.verification_status === "pending").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">care provider Applications</h1>
        {filter === "pending" && pendingCount > 0 && (
          <p className="mt-2 text-sm font-semibold" style={{ color: "#00b096" }}>
            {pendingCount} application{pendingCount !== 1 ? "s" : ""} awaiting review
          </p>
        )}
      </div>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 md:px-8">

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition"
              style={filter === f ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
            >
              {f === "unsubmitted" ? "Not Applied" : f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-20 text-center">
            <span className="mb-3 text-4xl">📋</span>
            <p className="text-sm font-semibold text-gray-500">No applications in this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(r => {
              const user       = resolveArr(r.users);
              const docs       = r.verification_docs;
              const sm         = STATUS_STYLE[r.verification_status] ?? STATUS_STYLE.pending;
              const isPending  = r.verification_status === "pending";
              const canUpgrade = r.verification_status === "approved" && r.provider_level === 1;
              const isBusy     = acting === r.id;

              return (
                <div key={r.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="p-5">

                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#0a2e30" }}>{user?.name ?? "—"}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {user?.email}
                          {user?.phone ? ` · ${user.phone}` : ""}
                          {" · "}Applied {docs ? fmtDate(docs.submitted_at) : fmtDate(r.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.verification_status === "approved" && (
                          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }}>
                            Level {r.provider_level}
                          </span>
                        )}
                        {canUpgrade && (
                          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: "rgba(8,145,178,.10)", color: "#0891b2" }}>
                            Level 2 Pending
                          </span>
                        )}
                        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: sm.bg, color: sm.color }}>
                          {sm.label}
                        </span>
                      </div>
                    </div>

                    {/* Submitted docs */}
                    {docs && (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Ghana Card</p>
                            <p className="text-sm font-mono font-semibold" style={{ color: "#0a2e30" }}>{docs.ghana_card_number}</p>
                            <p className="text-xs text-gray-500">{docs.legal_name}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Address</p>
                            <p className="text-sm" style={{ color: "#0a2e30" }}>{docs.address}</p>
                            <p className="text-xs text-gray-500">{ADDRESS_PROOF_LABELS[docs.address_proof_type] ?? docs.address_proof_type}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Reference 1</p>
                            <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{docs.ref1_name}</p>
                            <p className="font-mono text-xs text-gray-500">{docs.ref1_phone}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Reference 2</p>
                            <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>{docs.ref2_name}</p>
                            <p className="font-mono text-xs text-gray-500">{docs.ref2_phone}</p>
                          </div>
                        </div>

                        {docs.applying_level2 && (
                          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
                            <span className="text-sm">🏡</span>
                            <p className="text-xs font-semibold text-blue-700">Applying for Level 2 (home services)</p>
                          </div>
                        )}

                        {docs.notes && (
                          <div className="rounded-xl bg-gray-50 px-4 py-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Notes from applicant</p>
                            <p className="text-sm text-gray-700">{docs.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rejection note (resolved) */}
                    {r.verification_note && !isPending && (
                      <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-400">Admin note</p>
                        <p className="text-sm text-red-700">{r.verification_note}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {isPending && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-semibold text-gray-500">Approve at level:</label>
                          <div className="flex gap-2">
                            {[1, 2].map(lv => (
                              <button
                                key={lv}
                                type="button"
                                onClick={() => setLevelMap(prev => ({ ...prev, [r.id]: lv }))}
                                className="rounded-lg px-3 py-1.5 text-xs font-bold transition"
                                style={(levelMap[r.id] ?? 1) === lv
                                  ? { backgroundColor: "#0a2e30", color: "#fff" }
                                  : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
                              >
                                Level {lv} {lv === 1 ? "(Walking + Grooming)" : "(All Services)"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          value={noteMap[r.id] ?? ""}
                          onChange={e => setNoteMap(prev => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Note to provider (required if rejecting)"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={isBusy}
                            onClick={() => act(r.id, "approve")}
                            className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "#10b981" }}
                          >
                            {isBusy ? "…" : "✓ Approve"}
                          </button>
                          <button
                            disabled={isBusy || !noteMap[r.id]?.trim()}
                            onClick={() => act(r.id, "reject")}
                            className="flex-1 rounded-xl border border-red-200 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {isBusy ? "…" : "Reject"}
                          </button>
                        </div>
                        <p className="text-center text-[10px] text-gray-400">A note is required to reject. Provider will be notified by email.</p>
                      </div>
                    )}

                    {/* Level 2 upgrade */}
                    {canUpgrade && (
                      <div className="mt-4 space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold text-blue-700">
                          {docs?.applying_level2
                            ? "This provider applied for Level 2 (home services). Approve when their space check clears."
                            : "Upgrade this provider to Level 2 to unlock sitting, boarding, and daycare."}
                        </p>
                        <textarea
                          value={noteMap[r.id] ?? ""}
                          onChange={e => setNoteMap(prev => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Optional note to provider"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/20"
                        />
                        <button
                          disabled={isBusy}
                          onClick={() => upgrade(r.id)}
                          className="w-full rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#0891b2" }}
                        >
                          {isBusy ? "…" : "✓ Approve Level 2 — All Services"}
                        </button>
                      </div>
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
