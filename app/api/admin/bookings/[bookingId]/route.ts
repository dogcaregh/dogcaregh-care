import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

async function requireAdmin(): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await db().from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = db();
  const { bookingId } = params;

  const [{ data: booking, error }, { data: dispute }, { data: messages }] = await Promise.all([
    service
      .from("bookings")
      .select(`
        id, service_type, status, start_date, end_date, selected_dates,
        preferred_time, preferred_end_time, duration_hours,
        gross_amount, commission_amount, provider_payout, created_at,
        users!owner_id(name, email, phone),
        providers!provider_id(id, neighbourhood, users!user_id(name, email, phone)),
        dogs!dog_id(name, breed, size, age, vaccination_status, leash_trained)
      `)
      .eq("id", bookingId)
      .single(),
    service
      .from("disputes")
      .select("id, reason, description, status, admin_note, created_at")
      .eq("booking_id", bookingId)
      .maybeSingle(),
    service
      .from("messages")
      .select("id, sender_id, content, photo_url, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
  ]);

  if (error || !booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ booking, dispute: dispute ?? null, messages: messages ?? [] });
}
