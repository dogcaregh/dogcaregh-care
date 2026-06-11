import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";

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
    await resend.emails.send({
      from:    "DogCareGH <noreply@dogcaregh.com>",
      to:      emails,
      subject: `[DogCareGH] Weekly Digest — ${isGo ? "🟢 GO" : "🔴 HOLD"}`,
      html:    buildDigest(isGo, holdReason, gates, (openIncidents ?? []).length),
    });
  }

  return NextResponse.json({ ok: true, verdict: isGo ? "GO" : "HOLD", holdReason });
}

function buildDigest(isGo: boolean, holdReason: string, gates: any, openCount: number): string {
  const bpp = Number(gates.bookings_per_provider ?? 0);
  const hrs = Number(gates.median_response_hours ?? 0);
  const nrp = Number(gates.no_response_pct ?? 0);
  const rpt = Number(gates.repeat_rate ?? 0);

  const row = (label: string, val: string, ok: boolean) =>
    `<tr><td style="padding:5px 0;font-size:14px;color:#374151">${label}</td>
     <td style="padding:5px 0;font-size:14px;font-weight:600;text-align:right;color:${ok ? "#059669" : "#dc2626"}">${val}</td></tr>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
<tr><td style="background:#0a2e30;padding:22px 32px;text-align:center;">
  <span style="color:#fff;font-size:18px;font-weight:800;">Dog<span style="color:#00b096">Care</span>GH — Weekly Digest</span>
</td></tr>
<tr><td style="padding:24px 32px;">
  <div style="background:${isGo ? "rgba(5,150,105,.1)" : "rgba(220,38,38,.08)"};border-radius:10px;padding:14px 18px;margin-bottom:20px;text-align:center;">
    <p style="margin:0;font-size:15px;font-weight:700;color:${isGo ? "#059669" : "#dc2626"}">
      ${isGo ? "🟢 EXPANSION: GO" : `🔴 EXPANSION: HOLD — ${holdReason}`}
    </p>
  </div>
  <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Gates (last 30 days)</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;margin-bottom:20px;">
    ${row("Bookings / provider / month", bpp.toFixed(1), bpp >= 5)}
    ${row("Median response time", hrs > 0 ? `${hrs.toFixed(1)}h` : "—", hrs < 4)}
    ${row("No-response rate (48h)", `${nrp.toFixed(1)}%`, nrp < 10)}
    ${row("Repeat booking rate", `${rpt.toFixed(1)}%`, rpt >= 30)}
  </table>
  ${openCount > 0 ? `<p style="margin:0 0 20px;font-size:13px;color:#dc2626;font-weight:600">⚠ ${openCount} open incident(s) — review required</p>` : ""}
  <a href="${BASE_URL}/admin/metrics" style="display:inline-block;background:#00b096;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;">Open Dashboard</a>
</td></tr>
<tr><td style="padding:14px 32px;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:11px;color:#9ca3af">DogCareGH — admin weekly snapshot</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
