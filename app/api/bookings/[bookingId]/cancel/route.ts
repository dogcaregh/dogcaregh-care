import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { computeCancelPolicy, policyDescription } from "@/lib/cancel-policy";

export const dynamic = "force-dynamic";

const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function POST(
  _req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = db();
  const { bookingId } = params;

  const { data: booking, error: bErr } = await service
    .from("bookings")
    .select(`
      id, status, gross_amount, start_date, end_date, selected_dates,
      created_at, owner_id,
      providers!provider_id(user_id, users!user_id(name, email)),
      users!owner_id(name, email)
    `)
    .eq("id", bookingId)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bk          = booking as Record<string, unknown>;
  const provSnap    = Array.isArray(bk.providers) ? (bk.providers as Record<string, unknown>[])[0] : bk.providers as Record<string, unknown>;
  const provUserId  = provSnap?.user_id as string | null;
  const provUsers   = provSnap?.users;
  const provUser    = Array.isArray(provUsers) ? (provUsers as Record<string, unknown>[])[0] : provUsers as Record<string, unknown>;
  const ownerUsers  = Array.isArray(bk.users) ? (bk.users as Record<string, unknown>[])[0] : bk.users as Record<string, unknown>;

  const isOwner    = user.id === bk.owner_id;
  const isProvider = provUserId && user.id === provUserId;

  if (!isOwner && !isProvider) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cancellableStatuses = ["pending", "confirmed", "paid", "in_progress"];
  if (!cancellableStatuses.includes(bk.status as string)) {
    return NextResponse.json({ error: "This booking cannot be cancelled" }, { status: 400 });
  }

  const cancelledBy = isOwner ? "owner" : "provider";
  const policy = computeCancelPolicy(
    {
      status:         bk.status as string,
      gross_amount:   bk.gross_amount as number,
      start_date:     bk.start_date as string,
      end_date:       bk.end_date as string,
      created_at:     bk.created_at as string,
      selected_dates: bk.selected_dates as string[] | null,
    },
    cancelledBy,
  );

  const { ownerMsg, providerMsg } = policyDescription(policy, cancelledBy);

  // Update booking
  const { error: updateErr } = await service.from("bookings").update({
    status:            "cancelled",
    cancelled_by:      cancelledBy,
    cancelled_at:      new Date().toISOString(),
    refund_amount:     policy.refundAmount,
    penalty_amount:    policy.penaltyAmount,
    penalty_direction: policy.penaltyDirection,
    refund_policy:     policy.policyApplied,
    refund_status:     policy.policyApplied === "no_payment" ? "none" : "pending",
  }).eq("id", bookingId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // In-app notifications
  await service.from("notifications").insert({
    user_id:    bk.owner_id as string,
    booking_id: bookingId,
    type:       "booking_cancelled",
    message:    ownerMsg,
  });

  if (provUserId) {
    await service.from("notifications").insert({
      user_id:    provUserId,
      booking_id: bookingId,
      type:       "booking_cancelled",
      message:    providerMsg,
    });
  }

  // Emails (fire-and-forget)
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";

  const webhookSecret = process.env.NOTIFICATIONS_WEBHOOK_SECRET ?? "";
  if (ownerUsers?.email) {
    fetch(`${base}/api/notifications/email`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-webhook-secret": webhookSecret },
      body: JSON.stringify({ to: ownerUsers.email, type: "booking_cancelled", message: ownerMsg }),
    }).catch(() => {});
  }
  if (provUser?.email && provUserId) {
    fetch(`${base}/api/notifications/email`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-webhook-secret": webhookSecret },
      body: JSON.stringify({ to: provUser.email, type: "booking_cancelled", message: providerMsg }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, policy });
}
