import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY!;

  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const data = event.data;
  const bookingId = data.metadata?.booking_id as string | undefined;

  if (!bookingId) {
    return NextResponse.json({ error: "No booking ID in metadata" }, { status: 400 });
  }

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
    return NextResponse.json({ success: true });
  }

  const expectedPesewas = Math.round(Number(booking.gross_amount) * 100);
  if (data.amount !== expectedPesewas) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  await admin.from("bookings").update({ status: "paid", payment_ref: data.reference }).eq("id", bookingId);

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

  return NextResponse.json({ success: true });
}
