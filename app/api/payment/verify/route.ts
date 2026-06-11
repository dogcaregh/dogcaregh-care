import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { reference } = await req.json();

  if (!reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }

  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );

  const result = await paystackRes.json();

  if (!result.status || result.data.status !== "success") {
    return NextResponse.json(
      { error: "Payment not successful", paystackStatus: result.data?.status },
      { status: 400 }
    );
  }

  const bookingId = result.data.metadata?.booking_id as string | undefined;

  if (!bookingId) {
    return NextResponse.json({ error: "Could not resolve booking from payment" }, { status: 400 });
  }

  // Service-role client to bypass RLS for server-side writes
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: booking } = await admin
    .from("bookings")
    .select("id, gross_amount, status, provider_id, owner_id")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Idempotent — already paid is fine
  if (booking.status === "paid") {
    return NextResponse.json({ success: true, booking_id: bookingId });
  }

  // Guard against amount tampering
  const expectedPesewas = Math.round(Number(booking.gross_amount) * 100);
  if (result.data.amount !== expectedPesewas) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  await admin.from("bookings").update({ status: "paid", payment_ref: reference }).eq("id", bookingId);

  // Notify the provider
  const { data: provider } = await admin
    .from("providers")
    .select("user_id")
    .eq("id", booking.provider_id)
    .single();

  await admin.from("notifications").insert([
    ...(provider ? [{
      user_id: provider.user_id,
      booking_id: bookingId,
      type: "payment_received",
      message: "Payment received for your booking. Get ready for the service!",
      read: false,
    }] : []),
    {
      user_id: booking.owner_id,
      booking_id: bookingId,
      type: "payment_confirmed",
      message: "Your payment was successful! Your booking is now confirmed.",
      read: false,
    },
  ]);

  const base   = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";
  const secret = process.env.NOTIFICATIONS_WEBHOOK_SECRET ?? "";

  if (provider) {
    fetch(`${base}/api/notifications/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
      body: JSON.stringify({
        type: "INSERT",
        record: { user_id: provider.user_id, booking_id: bookingId, type: "payment_received", message: "Payment received for your booking. Get ready for the service!" },
      }),
    }).catch(() => {});
  }
  fetch(`${base}/api/notifications/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
    body: JSON.stringify({
      type: "INSERT",
      record: { user_id: booking.owner_id, booking_id: bookingId, type: "payment_confirmed", message: "Your payment was successful! Your booking is now confirmed." },
    }),
  }).catch(() => {});

  return NextResponse.json({ success: true, booking_id: bookingId });
}
