"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const INPUT = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:bg-white focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block mb-1.5 text-xs font-semibold text-gray-600";

export default function ProviderVerifyPage() {
  const router = useRouter();

  const [status,   setStatus]   = useState<string | null>(null);
  const [level,    setLevel]    = useState<number>(1);
  const [rejNote,  setRejNote]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  // Form fields
  const [ghanaCard,    setGhanaCard]    = useState("");
  const [legalName,    setLegalName]    = useState("");
  const [address,      setAddress]      = useState("");
  const [addressType,  setAddressType]  = useState("utility_bill");
  const [ref1Name,     setRef1Name]     = useState("");
  const [ref1Phone,    setRef1Phone]    = useState("");
  const [ref2Name,     setRef2Name]     = useState("");
  const [ref2Phone,    setRef2Phone]    = useState("");
  const [lvl2,         setLvl2]         = useState(false);
  const [notes,        setNotes]        = useState("");

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const res  = await fetch("/api/dashboard/provider");
      if (!res.ok) { router.replace("/register/provider"); return; }
      const { provider } = await res.json();

      setStatus(provider.verification_status ?? "unsubmitted");
      setLevel(provider.provider_level ?? 1);
      setRejNote(provider.verification_note ?? null);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/dashboard/provider/verify", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ghana_card_number:  ghanaCard.trim(),
        legal_name:         legalName.trim(),
        address:            address.trim(),
        address_proof_type: addressType,
        ref1_name:          ref1Name.trim(),
        ref1_phone:         ref1Phone.trim(),
        ref2_name:          ref2Name.trim(),
        ref2_phone:         ref2Phone.trim(),
        applying_level2:    lvl2,
        notes:              notes.trim() || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to submit. Please try again.");
    } else {
      setStatus("pending");
      setSuccess(true);
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <p className="animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <Link href="/dashboard/provider" className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10">
          ← Dashboard
        </Link>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">

        {/* Approved state */}
        {status === "approved" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <span className="mb-3 block text-4xl">✅</span>
            <p className="text-xl font-extrabold text-emerald-800">Verified — Level {level} Carer</p>
            <p className="mt-2 text-sm text-emerald-700">
              {level === 1
                ? "You can offer dog walking and grooming services."
                : "You can offer all DogCareGH services including home care."}
            </p>
            <Link href="/dashboard/provider" className="mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: "#00b096" }}>
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Pending state */}
        {status === "pending" && !success && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center">
            <span className="mb-3 block text-4xl">🕐</span>
            <p className="text-xl font-extrabold text-blue-800">Application Under Review</p>
            <p className="mt-2 text-sm text-blue-700">
              We&apos;re reviewing your application. We&apos;ll contact you within a few days. In the meantime, keep your profile up to date.
            </p>
            <Link href="/dashboard/provider" className="mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: "#00b096" }}>
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Just submitted */}
        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <span className="mb-3 block text-4xl">🎉</span>
            <p className="text-xl font-extrabold text-emerald-800">Application Submitted!</p>
            <p className="mt-2 text-sm text-emerald-700">
              We&apos;ll review your application and be in touch within a few days.
            </p>
            <Link href="/dashboard/provider" className="mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: "#00b096" }}>
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Form — unsubmitted or rejected */}
        {(status === "unsubmitted" || status === "rejected") && !success && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
                {status === "rejected" ? "Re-apply for Verification" : "Apply for Verification"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Complete this form to become a verified DogCareGH carer. We&apos;ll review your application and be in touch within a few days.
              </p>
            </div>

            {status === "rejected" && rejNote && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Previous rejection reason</p>
                <p className="mt-1 text-sm text-red-700">{rejNote}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Identity */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-extrabold" style={{ color: "#0a2e30" }}>Identity</h2>
                <div>
                  <label className={LABEL}>Ghana Card Number *</label>
                  <input className={INPUT} placeholder="GHA-000000000-0" value={ghanaCard} onChange={e => setGhanaCard(e.target.value)} required />
                </div>
                <div>
                  <label className={LABEL}>Full legal name (as on Ghana Card) *</label>
                  <input className={INPUT} placeholder="e.g. Kwame Asante" value={legalName} onChange={e => setLegalName(e.target.value)} required />
                </div>
              </div>

              {/* Address */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-extrabold" style={{ color: "#0a2e30" }}>Address</h2>
                <div>
                  <label className={LABEL}>Your current address *</label>
                  <input className={INPUT} placeholder="e.g. 12 Labone Street, Accra" value={address} onChange={e => setAddress(e.target.value)} required />
                </div>
                <div>
                  <label className={LABEL}>Proof of address type *</label>
                  <select className={INPUT} value={addressType} onChange={e => setAddressType(e.target.value)}>
                    <option value="utility_bill">Utility Bill</option>
                    <option value="tenancy_agreement">Tenancy Agreement</option>
                    <option value="assembly_member">Assembly Member / Community Elder Note</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="mt-1 text-[11px] text-gray-400">We will ask for a copy during the review process.</p>
                </div>
              </div>

              {/* References */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold" style={{ color: "#0a2e30" }}>References</h2>
                  <p className="mt-0.5 text-xs text-gray-400">People who can vouch for your character — an elder, former employer, assembly member, or dog owner you&apos;ve helped. We will call them.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>Reference 1 — Name *</label>
                    <input className={INPUT} placeholder="e.g. Abena Mensah" value={ref1Name} onChange={e => setRef1Name(e.target.value)} required />
                  </div>
                  <div>
                    <label className={LABEL}>Reference 1 — Phone *</label>
                    <input className={INPUT} placeholder="0244 000 000" value={ref1Phone} onChange={e => setRef1Phone(e.target.value)} required />
                  </div>
                  <div>
                    <label className={LABEL}>Reference 2 — Name *</label>
                    <input className={INPUT} placeholder="e.g. Kofi Boateng" value={ref2Name} onChange={e => setRef2Name(e.target.value)} required />
                  </div>
                  <div>
                    <label className={LABEL}>Reference 2 — Phone *</label>
                    <input className={INPUT} placeholder="0277 000 000" value={ref2Phone} onChange={e => setRef2Phone(e.target.value)} required />
                  </div>
                </div>
              </div>

              {/* Level */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
                <h2 className="text-sm font-extrabold" style={{ color: "#0a2e30" }}>Service Level</h2>
                <p className="text-xs text-gray-500">All carers start at Level 1. If you have a safe space for dogs to stay, you can apply for Level 2 at the same time.</p>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-4 transition hover:bg-gray-50">
                  <input type="checkbox" checked={lvl2} onChange={e => setLvl2(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-[#00b096]" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>Also apply for Level 2 — Home Carer</p>
                    <p className="mt-0.5 text-xs text-gray-400">Adds daycare, in-home sitting, and overnight services. Requires a space check.</p>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <label className={LABEL}>Additional notes (optional)</label>
                <textarea
                  className={INPUT}
                  rows={3}
                  placeholder="Anything else you'd like us to know — experience with dogs, relevant work history, etc."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#00b096" }}
              >
                {saving ? "Submitting…" : "Submit Application"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
