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

  const { data: booking, error: fetchErr } = await db()
    .from("bookings")
    .select("payment_ref, refund_amount, refund_status")
    .eq("id", id)
    .single();

  if (fetchErr || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.refund_status === "processed") return NextResponse.json({ error: "Already processed" }, { status: 409 });
  if (!booking.payment_ref) return NextResponse.json({ error: "No payment reference on record — cannot refund via Paystack" }, { status: 422 });
  if (!booking.refund_amount || Number(booking.refund_amount) <= 0) return NextResponse.json({ error: "Refund amount is zero" }, { status: 422 });

  const amountPesewas = Math.round(Number(booking.refund_amount) * 100);

  const psRes = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transaction: booking.payment_ref, amount: amountPesewas }),
  });

  const psData = await psRes.json();
  if (!psRes.ok || !psData.status) {
    return NextResponse.json(
      { error: psData.message ?? "Paystack refund failed" },
      { status: 502 }
    );
  }

  const { error } = await db()
    .from("bookings")
    .update({ refund_status: "processed" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db().from("messages").insert({
    booking_id: id,
    sender_id:  null,
    content:    `[Admin] Refund of GHS ${Number(booking.refund_amount).toFixed(2)} issued via Paystack.${note?.trim() ? ` Note: ${note.trim()}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}
