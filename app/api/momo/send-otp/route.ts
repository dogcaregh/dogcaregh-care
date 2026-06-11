import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

function normalizePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s\-()+]/g, "");
  if (/^0\d{9}$/.test(stripped)) return "233" + stripped.slice(1);
  if (/^233\d{9}$/.test(stripped)) return stripped;
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await request.json();
  const normalized = normalizePhone(phone ?? "");
  if (!normalized) {
    return NextResponse.json({ error: "Enter a valid Ghanaian mobile money number." }, { status: 400 });
  }

  const db = admin();

  // Rate limit: one OTP per 2 minutes per number
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { count } = await db
    .from("momo_otps")
    .select("id", { count: "exact", head: true })
    .eq("phone", normalized)
    .gte("created_at", twoMinsAgo);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Please wait 2 minutes before requesting a new code." }, { status: 429 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.from("momo_otps").insert({ phone: normalized, code, expires_at: expiresAt });

  // Send via Hubtel SMS
  const clientId     = process.env.HUBTEL_CLIENT_ID!;
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET!;
  const senderId     = process.env.HUBTEL_SENDER_ID ?? "DogCareGH";
  const message      = `Your DogCareGH verification code is ${code}. Valid for 10 minutes.`;

  const hubtelUrl = `https://sms.hubtel.com/v1/messages/send?clientsecret=${encodeURIComponent(clientSecret)}&clientid=${encodeURIComponent(clientId)}&from=${encodeURIComponent(senderId)}&to=${normalized}&content=${encodeURIComponent(message)}`;

  const smsRes = await fetch(hubtelUrl);
  if (!smsRes.ok) {
    return NextResponse.json({ error: "Failed to send SMS. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
