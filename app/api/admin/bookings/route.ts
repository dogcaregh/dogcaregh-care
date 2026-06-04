import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: me } = await db.from("users").select("role").eq("id", user.id).single();
  if ((me as { role: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data } = await db
    .from("bookings")
    .select(`
      id, service_type, status, start_date, end_date,
      gross_amount, commission_amount, provider_payout, created_at,
      users!owner_id(name),
      providers!provider_id(users!user_id(name))
    `)
    .order("created_at", { ascending: false });

  return NextResponse.json({ bookings: data ?? [] });
}
