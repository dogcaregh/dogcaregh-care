import { NextRequest, NextResponse } from "next/server";
import { serviceDb } from "@/lib/require-admin";
import { verifyUnsubscribe } from "@/lib/campaign-email";

export const dynamic = "force-dynamic";

// Public one-click unsubscribe. Sets users.marketing_opt_out = true.
// Transactional email ignores this flag, so bookings/receipts are unaffected.
async function optOut(u: string, t: string): Promise<boolean> {
  if (!verifyUnsubscribe(u, t)) return false;
  const { error } = await serviceDb().from("users").update({ marketing_opt_out: true }).eq("id", u);
  return !error;
}

function page(title: string, message: string, ok: boolean): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
  <style>body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#fbf7ef;color:#103d36;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border-radius:16px;box-shadow:0 2px 16px rgba(16,61,54,.12);max-width:440px;padding:40px 36px;text-align:center}
  h1{font-size:22px;margin:0 0 10px}p{color:#4a5957;font-size:15px;line-height:1.6;margin:0 0 20px}
  .dot{width:52px;height:52px;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;font-size:26px;background:${ok ? "#e7f4ef" : "#fdecea"}}
  a{display:inline-block;background:#15a08f;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:600;font-size:14px}</style></head>
  <body><div class="card"><div class="dot">${ok ? "✓" : "!"}</div><h1>${title}</h1><p>${message}</p><a href="https://dogcaregh.com">Back to DogCareGH</a></div></body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") || "";
  const t = req.nextUrl.searchParams.get("t") || "";
  const ok = await optOut(u, t);
  return ok
    ? page("You're unsubscribed", "You won't receive marketing updates from DogCareGH anymore. You'll still get essential emails about your bookings and payments.", true)
    : page("Link not valid", "We couldn't process this unsubscribe link. Please try again from a recent email, or contact support.", false);
}

// List-Unsubscribe-Post one-click (RFC 8058).
export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") || "";
  const t = req.nextUrl.searchParams.get("t") || "";
  const ok = await optOut(u, t);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
