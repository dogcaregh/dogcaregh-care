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

  const { phone, code, network } = await request.json();
  const normalized = normalizePhone(phone ?? "");
  if (!normalized || !code || !network) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const db = admin();
  const now = new Date().toISOString();

  const { data: otp } = await db
    .from("momo_otps")
    .select("id, code, expires_at, used")
    .eq("phone", normalized)
    .eq("used", false)
    .gte("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || otp.code !== code) {
    return NextResponse.json({ error: "Invalid or expired code. Please request a new one." }, { status: 400 });
  }

  // Mark OTP used
  await db.from("momo_otps").update({ used: true }).eq("id", otp.id);

  // Save verified number on provider record
  await db
    .from("providers")
    .update({ momo_number: normalized, momo_network: network, momo_verified: true })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
