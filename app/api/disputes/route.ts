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

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId, reason, description } = await req.json();
  if (!bookingId || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = db();

  const { data: booking, error: bErr } = await service
    .from("bookings")
    .select("id, status, owner_id")
    .eq("id", bookingId)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!["in_progress", "completed_pending"].includes(booking.status)) {
    return NextResponse.json(
      { error: "Disputes can only be raised while a service is in progress or awaiting your confirmation" },
      { status: 400 }
    );
  }

  const { data: existing } = await service
    .from("disputes")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "A dispute has already been raised for this booking" }, { status: 409 });
  }

  const { error } = await service.from("disputes").insert({
    booking_id:  bookingId,
    raised_by:   user.id,
    reason,
    description: description?.trim() || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
