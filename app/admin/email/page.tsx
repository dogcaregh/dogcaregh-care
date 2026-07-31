"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaign-templates";

const TEAL = "#0a2e30";
const GREEN = "#00b096";

type Cohort = { key: string; label: string; audienceKey: string; templateKey: string; count: number };
type Suggestion = { weekStart: string; cohorts: Cohort[]; fresh: boolean };
type AudiencesResp = { counts: Record<string, number>; labels: Record<string, string>; suggestion: Suggestion };
type PreviewResp = { count: number; subject: string; sample: { firstName: string; email: string | null }; html: string };
type CampaignRow = { id: string; template_key: string; subject: string; audience_label: string; recipient_count: number; sent_count: number; failed_count: number; is_test: boolean; created_at: string };
type UserLite = { id: string; name: string; email: string; role: string };
type RecipientRow = { email: string; first_name: string | null; status: string; error: string | null; created_at: string };

const OWNER_SEGMENTS = ["seg_owner_no_dog", "seg_owner_no_location", "seg_owner_inactive"];
const CAREGIVER_SEGMENTS = ["seg_cg_unsubmitted", "seg_cg_incomplete"];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function BulkEmailPage() {
  const ready = useAdminGuard();

  const [aud, setAud] = useState<AudiencesResp | null>(null);
  const [log, setLog] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  // composer state
  const [templateKey, setTemplateKey] = useState<string>("");
  const [audType, setAudType] = useState<"all" | "segment" | "individuals">("all");
  const [segmentKey, setSegmentKey] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<UserLite[]>([]);

  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);

  const template = useMemo(() => CAMPAIGN_TEMPLATES.find((t) => t.key === templateKey) || null, [templateKey]);

  const audienceKey = useMemo(() => {
    if (!template) return "";
    if (audType === "all") return template.audience === "owner" ? "all_owners" : "all_caregivers";
    if (audType === "segment") return segmentKey;
    return "individuals";
  }, [template, audType, segmentKey]);

  const loadAudiences = useCallback(() => {
    fetch("/api/admin/campaigns/audiences").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setAud(d); });
  }, []);
  const loadLog = useCallback(() => {
    fetch("/api/admin/campaigns").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setLog(d.campaigns); });
  }, []);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      fetch("/api/admin/campaigns/audiences").then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/campaigns").then((r) => r.ok ? r.json() : null),
    ]).then(([a, l]) => { if (a) setAud(a); if (l) setLog(l.campaigns); setLoading(false); });
  }, [ready]);

  // fetch preview whenever the composed campaign changes
  useEffect(() => {
    if (!template || !audienceKey) { setPreview(null); return; }
    if (audType === "individuals" && selectedUsers.length === 0) { setPreview(null); return; }
    setPreviewing(true);
    const body = JSON.stringify({ templateKey, audienceKey, userIds: selectedUsers.map((u) => u.id) });
    const ctrl = new AbortController();
    fetch("/api/admin/campaigns/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPreview(d); })
      .catch(() => {})
      .finally(() => setPreviewing(false));
    return () => ctrl.abort();
  }, [template, templateKey, audienceKey, audType, selectedUsers]);

  function pickTemplate(t: CampaignTemplate) {
    setTemplateKey(t.key);
    setAudType("all");
    setSegmentKey(t.audience === "owner" ? OWNER_SEGMENTS[0] : CAREGIVER_SEGMENTS[0]);
    setSelectedUsers([]);
    setBanner(null);
    setConfirming(false);
  }

  // suggestion box → prepare that cohort's campaign
  function prepareCohort(c: Cohort) {
    const t = CAMPAIGN_TEMPLATES.find((x) => x.key === c.templateKey);
    if (!t) return;
    setTemplateKey(t.key);
    setSelectedUsers([]);
    setBanner(null);
    setConfirming(false);
    if (c.audienceKey === "all_owners" || c.audienceKey === "all_caregivers") setAudType("all");
    else { setAudType("segment"); setSegmentKey(c.audienceKey); }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function sendTest() {
    setTesting(true); setBanner(null);
    const res = await fetch("/api/admin/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateKey, test: true }) });
    const d = await res.json().catch(() => ({}));
    setTesting(false);
    setBanner(res.ok ? { kind: "ok", text: `Test sent to ${d.sentTo}. Check your inbox.` } : { kind: "err", text: d.error || "Test failed." });
  }

  async function doSend() {
    setSending(true); setBanner(null);
    const res = await fetch("/api/admin/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateKey, audienceKey, userIds: selectedUsers.map((u) => u.id) }) });
    const d = await res.json().catch(() => ({}));
    setSending(false); setConfirming(false);
    if (res.ok) {
      setBanner({ kind: "ok", text: `Sent to ${d.sent} recipient${d.sent === 1 ? "" : "s"}${d.failed ? `, ${d.failed} failed` : ""}.` });
      loadAudiences(); loadLog();
    } else setBanner({ kind: "err", text: d.error || "Send failed." });
  }

  const count = preview?.count ?? (audienceKey && aud ? aud.counts[audienceKey] ?? 0 : 0);
  const segmentOptions = template ? (template.audience === "owner" ? OWNER_SEGMENTS : CAREGIVER_SEGMENTS) : [];

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: TEAL }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />
      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: TEAL }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: GREEN }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white md:text-3xl">Bulk Email Sender</h1>
        <p className="mt-1 text-sm text-white/60">Personalised campaigns to owners and caregivers. Separate from booking &amp; payment email.</p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">

        {/* Suggestion box */}
        {aud?.suggestion && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: TEAL }}>Weekly suggestion — unfinished profiles</p>
              <span className="text-[11px] text-gray-400">week of {aud.suggestion.weekStart} · recomputes weekly</span>
            </div>
            <p className="mb-4 text-xs text-gray-500">People who haven&apos;t completed their profile. Send the relevant reminder — they drop off as they finish.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {aud.suggestion.cohorts.map((c) => (
                <div key={c.key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-2xl font-extrabold" style={{ color: TEAL }}>{c.count}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-gray-500 leading-snug">{c.label}</p>
                  <button
                    onClick={() => prepareCohort(c)}
                    disabled={c.count === 0}
                    className="mt-3 w-full rounded-lg px-3 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: GREEN }}
                  >
                    Prepare reminder →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* LEFT: composer */}
          <div className="space-y-6">
            {/* Step 1: pick email */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-bold" style={{ color: TEAL }}>1 · Pick an email</p>
              {(["owner", "caregiver"] as const).map((audience) => (
                <div key={audience} className="mb-3">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{audience === "owner" ? "Owners" : "Caregivers"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CAMPAIGN_TEMPLATES.filter((t) => t.audience === audience).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => pickTemplate(t)}
                        className="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition"
                        style={templateKey === t.key
                          ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
                          : { backgroundColor: "#fff", color: "#334155", borderColor: "#e5e7eb" }}
                        title={t.subject}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Step 2: audience */}
            {template && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold" style={{ color: TEAL }}>2 · Choose who it goes to</p>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={audType === "all"} onChange={() => setAudType("all")} />
                    <span>All {template.audience === "owner" ? "owners" : "caregivers"}</span>
                    <span className="ml-auto text-xs font-bold" style={{ color: GREEN }}>{aud?.counts[template.audience === "owner" ? "all_owners" : "all_caregivers"] ?? "…"}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={audType === "segment"} onChange={() => setAudType("segment")} />
                    <span>A segment</span>
                  </label>
                  {audType === "segment" && (
                    <div className="ml-6 space-y-1">
                      {segmentOptions.map((s) => (
                        <label key={s} className="flex items-center gap-2 text-[13px]">
                          <input type="radio" checked={segmentKey === s} onChange={() => setSegmentKey(s)} />
                          <span>{aud?.labels[s] ?? s}</span>
                          <span className="ml-auto text-xs font-bold" style={{ color: GREEN }}>{aud?.counts[s] ?? "…"}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={audType === "individuals"} onChange={() => setAudType("individuals")} />
                    <span>Specific individuals</span>
                  </label>
                  {audType === "individuals" && (
                    <IndividualPicker role={template.audience} selected={selectedUsers} onChange={setSelectedUsers} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: preview + actions */}
          <div className="space-y-4">
            {!template ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                Pick an email to preview it here.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: TEAL }}>Preview</p>
                    <span className="text-xs text-gray-400">
                      {previewing ? "rendering…" : preview?.sample ? `as ${preview.sample.firstName}${preview.sample.email ? ` · ${preview.sample.email}` : " (sample)"}` : ""}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-gray-500"><b>Subject:</b> {template.subject}</p>
                  {template.note && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">{template.note}</p>}
                  <iframe title="email preview" className="h-[420px] w-full rounded-lg border border-gray-100" srcDoc={preview?.html ?? ""} />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-baseline justify-between">
                    <p className="text-sm font-bold" style={{ color: TEAL }}>Recipients</p>
                    <p className="text-2xl font-extrabold" style={{ color: TEAL }}>{previewing ? "…" : count}</p>
                  </div>
                  <p className="mb-4 text-[11px] text-gray-400">Unsubscribed people are always filtered out{aud?.counts.opted_out ? ` (${aud.counts.opted_out} opted out)` : ""}.</p>

                  {banner && (
                    <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-semibold ${banner.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{banner.text}</div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button onClick={sendTest} disabled={testing} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40">
                      {testing ? "Sending…" : "Send test to myself"}
                    </button>
                    {!confirming ? (
                      <button onClick={() => setConfirming(true)} disabled={count === 0} className="rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: GREEN }}>
                        Send campaign →
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                        <span className="text-xs font-semibold text-gray-600">Send to {count}?</span>
                        <button onClick={doSend} disabled={sending} className="rounded-md px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: GREEN }}>{sending ? "Sending…" : "Confirm"}</button>
                        <button onClick={() => setConfirming(false)} disabled={sending} className="rounded-md px-3 py-1.5 text-xs font-bold text-gray-500">Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Campaign log */}
        <CampaignLog log={log} />
      </div>
    </div>
  );
}

// ---- individual recipient picker ----
function IndividualPicker({ role, selected, onChange }: { role: "owner" | "caregiver"; selected: UserLite[]; onChange: (u: UserLite[]) => void }) {
  const [all, setAll] = useState<UserLite[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.ok ? r.json() : null).then((d) => {
      if (!d?.users) return;
      setAll((d.users as UserLite[]).filter((u) => (role === "owner" ? u.role === "owner" : u.role === "provider")));
    });
  }, [role]);
  const ids = new Set(selected.map((u) => u.id));
  const matches = q.trim() ? all.filter((u) => !ids.has(u.id) && (`${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 6) : [];
  return (
    <div className="ml-6">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[13px]" />
      {matches.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-lg border border-gray-100">
          {matches.map((u) => (
            <button key={u.id} onClick={() => { onChange([...selected, u]); setQ(""); }} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] hover:bg-gray-50">
              <span className="font-medium text-gray-700">{u.name || "—"}</span><span className="text-gray-400">{u.email}</span>
            </button>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span key={u.id} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700">
              {u.name || u.email}
              <button onClick={() => onChange(selected.filter((x) => x.id !== u.id))} className="text-gray-400 hover:text-gray-600">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- campaign log + recipient drilldown ----
function CampaignLog({ log }: { log: CampaignRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [loadingR, setLoadingR] = useState(false);

  function open(id: string) {
    setOpenId(id); setRecipients([]); setLoadingR(true);
    fetch(`/api/admin/campaigns?id=${id}`).then((r) => r.ok ? r.json() : null).then((d) => { setRecipients(d?.recipients ?? []); setLoadingR(false); });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-50 px-5 py-4"><p className="text-sm font-bold" style={{ color: TEAL }}>Campaign log</p></div>
      {log.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">No campaigns sent yet.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {log.map((c) => (
            <div key={c.id}>
              <button onClick={() => (openId === c.id ? setOpenId(null) : open(c.id))} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: TEAL }}>
                    {c.subject}{c.is_test && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">TEST</span>}
                  </p>
                  <p className="text-[11px] text-gray-400">{c.audience_label} · {fmtDate(c.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{c.sent_count}/{c.recipient_count}</p>
                  {c.failed_count > 0 && <p className="text-[10px] text-red-500">{c.failed_count} failed</p>}
                </div>
              </button>
              {openId === c.id && (
                <div className="bg-gray-50 px-5 py-3">
                  {loadingR ? <p className="text-xs text-gray-400">Loading recipients…</p> : (
                    <div className="max-h-56 overflow-auto rounded-lg border border-gray-100 bg-white">
                      <table className="w-full text-[11px]">
                        <thead><tr className="text-left text-gray-400"><th className="px-3 py-1.5">Name</th><th className="px-3 py-1.5">Email</th><th className="px-3 py-1.5">Status</th></tr></thead>
                        <tbody>
                          {recipients.map((r, i) => (
                            <tr key={i} className="border-t border-gray-50">
                              <td className="px-3 py-1.5">{r.first_name || "—"}</td>
                              <td className="px-3 py-1.5 text-gray-500">{r.email}</td>
                              <td className="px-3 py-1.5">
                                <span className={r.status === "sent" ? "text-emerald-600" : "text-red-500"}>{r.status}</span>
                                {r.error && <span className="ml-1 text-gray-400" title={r.error}>ⓘ</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
