import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = db();

  const { data: provider, error } = await service
    .from("providers")
    .select(
      `id, active, bio, years_experience, neighbourhood,
       avatar_url, gallery_photos, momo_network, momo_number,
       verification_status, provider_level, verification_note, blocked_dates,
       referral_code, referral_balance,
       users!user_id(name, phone)`
    )
    .eq("user_id", user.id)
    .single();

  if (error || !provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json({ provider });
}
