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

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") ?? "pending";

  let query = db()
    .from("bookings")
    .select(`
      id, service_type, start_date, gross_amount, refund_amount, penalty_amount,
      penalty_direction, refund_policy, refund_status, cancelled_by, cancelled_at,
      users!owner_id(name, email),
      providers!provider_id(users!user_id(name, email))
    `)
    .eq("status", "cancelled")
    .not("refund_policy", "eq", "no_payment")
    .order("cancelled_at", { ascending: false });

  if (status !== "all") query = query.eq("refund_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ refunds: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, note } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await db()
    .from("bookings")
    .update({ refund_status: "processed" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional note stored as a message on the booking
  if (note?.trim()) {
    await db().from("messages").insert({
      booking_id: id,
      sender_id:  null,
      content:    `[Admin] Refund processed: ${note.trim()}`,
    });
  }

  return NextResponse.json({ ok: true });
}
