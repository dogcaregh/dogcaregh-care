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

export async function GET(
  _req: Request,
  { params }: { params: { bookingId: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = db();
  const { bookingId } = params;

  const { data: booking, error } = await service
    .from("bookings")
    .select(
      `id, service_type, start_date, end_date, selected_dates, additional_dog_ids,
       preferred_time, preferred_end_time, duration_hours,
       gross_amount, provider_payout, status, owner_id, created_at,
       providers!provider_id(id, user_id, avatar_url, neighbourhood, users!user_id(name)),
       dogs!dog_id(id, name, breed, size, age, vaccination_status, leash_trained),
       users!owner_id(name, avatar_url, location)`
    )
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bk = booking as Record<string, unknown>;
  const prov = Array.isArray(bk.providers) ? bk.providers[0] : bk.providers;
  const isOwner    = user.id === bk.owner_id;
  const isProvider = prov && user.id === (prov as Record<string, unknown>).user_id;

  if (!isOwner && !isProvider) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Also fetch existing review for this user on this booking
  const { data: review } = await service
    .from("reviews")
    .select("rating, body")
    .eq("booking_id", bookingId)
    .eq("from_user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ booking, review: review ?? null });
}
