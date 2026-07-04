import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Links the currently-authenticated owner to the provider who owns
// `code`. Idempotent and safe to call more than once — a referral is
// permanent (one per referee) and never overwritten.
export async function POST(req: NextRequest) {
  const { code } = await req.json().catch(() => ({ code: undefined }));

  const rawCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!rawCode) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Already referred? Leave the existing link untouched.
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referee_user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyReferred: true });
  }

  // Resolve the code to a provider.
  const { data: provider } = await admin
    .from("providers")
    .select("id, user_id")
    .eq("referral_code", rawCode)
    .maybeSingle();

  if (!provider) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  }

  // No self-referral.
  if (provider.user_id === user.id) {
    return NextResponse.json({ error: "You cannot use your own referral code" }, { status: 400 });
  }

  const { error: refErr } = await admin.from("referrals").insert({
    referrer_provider_id: provider.id,
    referrer_user_id: provider.user_id,
    referee_user_id: user.id,
    referral_code: rawCode,
  });

  if (refErr) {
    // Unique-violation race (another request attached first) is fine.
    return NextResponse.json({ ok: true, alreadyReferred: true });
  }

  await admin
    .from("users")
    .update({ referred_by_provider_id: provider.id, referred_by_code: rawCode })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
