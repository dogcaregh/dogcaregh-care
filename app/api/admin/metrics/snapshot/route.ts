/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderDogCareEmail } from "@/lib/dogCareEmail";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dogcaregh.com";

const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = db();

  // Snapshot = previous 7 days (Mon→Sun ending yesterday)
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartDate = weekStart.toISOString().split("T")[0];

  const { error: snapErr } = await admin.rpc("compute_weekly_snapshot", { p_week_start: weekStartDate });
  if (snapErr) console.error("[snapshot] compute failed:", snapErr.message);

  // Last 2 weeks of snapshots for GO/HOLD
  const { data: snapshots } = await admin
    .from("metric_snapshots")
    .select("week_start, metric_key, gate_status")
    .order("week_start", { ascending: false })
    .limit(8);

  // Open incidents
  const { data: openIncidents } = await admin
    .from("incidents")
    .select("type")
    .eq("status", "open");

  // GO/HOLD: all 4 gate keys green in each of the last 2 weeks, no blocking incidents
  const weeks = Array.from(new Set((snapshots ?? []).map((s: any) => s.week_start as string)))
    .sort()
    .reverse()
    .slice(0, 2);

  const allGreen = weeks.every(w => {
    const ws = (snapshots ?? []).filter((s: any) => s.week_start === w);
    return (
      ws.find((s: any) => s.metric_key === "gate_bpp")?.gate_status === "green" &&
      ws.find((s: any) => s.metric_key === "gate_response_hours")?.gate_status === "green" &&
      ws.find((s: any) => s.metric_key === "gate_no_response_pct")?.gate_status === "green" &&
      ws.find((s: any) => s.metric_key === "gate_repeat_rate")?.gate_status === "green"
    );
  });

  const blocking = (openIncidents ?? []).filter((i: any) =>
    ["safety_dog", "safety_person", "provider_conduct"].includes(i.type)
  );

  const isGo = weeks.length >= 2 && allGreen && blocking.length === 0;
  let holdReason = "";
  if (!isGo) {
    if (blocking.length > 0)  holdReason = `${blocking.length} open safety/conduct incident(s)`;
    else if (weeks.length < 2) holdReason = "Insufficient snapshot history (< 2 weeks)";
    else if (!allGreen)        holdReason = "One or more gates red in the last two weeks";
  }

  // Current 30-day metrics for the digest
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400_000);
  const { data: metrics } = await admin.rpc("get_metrics", {
    p_from: thirtyAgo.toISOString(),
    p_to:   now.toISOString(),
  });

  // Email all admins
  const { data: admins } = await admin.from("users").select("email").eq("role", "admin");
  const emails = (admins ?? []).map((a: any) => a.email as string).filter(Boolean);

  if (emails.length > 0 && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const gates = (metrics as any)?.gates ?? {};
    const bpp = Number(gates.bookings_per_provider ?? 0);
    const hrs = Number(gates.median_response_hours ?? 0);
    const nrp = Number(gates.no_response_pct ?? 0);
    const rpt = Number(gates.repeat_rate ?? 0);
    const openCount = (openIncidents ?? []).length;
    const green = (v: string) => `<span style="color:#059669;font-weight:700">${v}</span>`;
    const red   = (v: string) => `<span style="color:#dc2626;font-weight:700">${v}</span>`;
    await resend.emails.send({
      from:    "DogCareGH <noreply@dogcaregh.com>",
      to:      emails,
      subject: `[DogCareGH] Weekly Digest — ${isGo ? "🟢 GO" : "🔴 HOLD"}`,
      html:    renderDogCareEmail({
        preheader:  `Weekly metrics digest — ${isGo ? "GO" : "HOLD"}`,
        heading:    `Weekly Digest — ${isGo ? "🟢 GO" : "🔴 HOLD"}`,
        intro:      isGo
          ? "All expansion gates passed for the last two weeks. The platform is ready for expansion."
          : `HOLD — ${holdReason}.`,
        rows: [
          { label: "Bookings / provider / month", value: bpp >= 5  ? green(bpp.toFixed(1))              : red(bpp.toFixed(1)) },
          { label: "Median response time",        value: hrs < 4   ? green(hrs > 0 ? `${hrs.toFixed(1)}h` : "—") : red(hrs > 0 ? `${hrs.toFixed(1)}h` : "—") },
          { label: "No-response rate (48h)",      value: nrp < 10  ? green(`${nrp.toFixed(1)}%`)        : red(`${nrp.toFixed(1)}%`) },
          { label: "Repeat booking rate",         value: rpt >= 30 ? green(`${rpt.toFixed(1)}%`)        : red(`${rpt.toFixed(1)}%`) },
          ...(openCount > 0 ? [{ label: "Open incidents", value: red(`⚠ ${openCount} — review required`) }] : []),
        ],
        buttonText: "Open Dashboard",
        buttonUrl:  `${BASE_URL}/admin/metrics`,
        footerNote: "DogCareGH — admin weekly snapshot",
      }),
    });
  }

  return NextResponse.json({ ok: true, verdict: isGo ? "GO" : "HOLD", holdReason });
}

