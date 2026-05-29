import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { bookingId } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const sb = createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: booking } = await sb
    .from("bookings")
    .select("id, gross_amount, status, owner_id")
    .eq("id", bookingId)
    .eq("owner_id", user.id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 400 });
  }

  const reference = `dogcare_${bookingId}_${Date.now()}`;
  const amountInPesewas = Math.round(Number(booking.gross_amount) * 100);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: amountInPesewas,
      currency: "GHS",
      reference,
      callback_url: `${siteUrl}/payment/callback`,
      metadata: { booking_id: bookingId },
    }),
  });

  const result = await paystackRes.json();

  if (!result.status) {
    return NextResponse.json({ error: result.message ?? "Paystack error" }, { status: 500 });
  }

  return NextResponse.json({
    authorization_url: result.data.authorization_url,
    reference: result.data.reference,
  });
}
