"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { buildReportHtml, type ReportData } from "@/lib/report-html";

export default function AdminReportPage() {
  const ready = useAdminGuard();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/report");
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed (${res.status})`);
        const data = (await res.json()) as ReportData;
        if (!cancelled) setHtml(buildReportHtml(data));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load report");
      }
    })();
    return () => { cancelled = true; };
  }, [ready]);

  if (!ready || (!html && !error)) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Building report…</p>
    </div>
  );

  return (
    <div className="report-shell" style={{ backgroundColor: "#e9eeec", minHeight: "100vh" }}>
      <style>{`@media print { .no-print { display: none !important; } .report-shell { background: #fff !important; } .report-page { max-width: none !important; box-shadow: none !important; margin: 0 !important; } }`}</style>

      {/* Toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs font-semibold text-white/70 hover:text-white">← Back to admin</Link>
          <span className="hidden text-xs font-bold uppercase tracking-widest sm:block" style={{ color: "#00b096" }}>Users &amp; Bookings Report</span>
        </div>
        <button
          onClick={() => window.print()}
          disabled={!html}
          className="rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: "#00b096" }}
        >
          Download PDF
        </button>
      </div>

      <p className="no-print mx-auto max-w-[860px] px-4 pt-4 text-xs text-gray-500">
        Live snapshot generated now. Click <b>Download PDF</b>, then choose “Save as PDF” as the destination for a print-perfect copy.
      </p>

      {error ? (
        <div className="mx-auto max-w-[860px] px-4 py-16 text-center text-sm text-red-600">{error}</div>
      ) : (
        <div className="report-page mx-auto my-6 max-w-[860px] bg-white shadow-lg" dangerouslySetInnerHTML={{ __html: html! }} />
      )}
    </div>
  );
}
