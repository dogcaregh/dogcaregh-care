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

const ALLOWED = ["booking_request", "booking_confirmed", "booking_declined"] as const;
type TriggerType = (typeof ALLOWED)[number];

const DEFAULT_MESSAGES: Record<TriggerType, string> = {
  booking_request:  "You have a new booking request.",
  booking_confirmed: "Your booking has been accepted. Complete payment to confirm.",
  booking_declined:  "Your booking request has been declined.",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = (await req.json()) as { type: TriggerType };
  if (!ALLOWED.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const service = db();
  const { data: booking } = await service
    .from("bookings")
    .select("id, owner_id, providers!provider_id(user_id)")
    .eq("id", params.bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bk = booking as Record<string, unknown>;
  const provSnap = Array.isArray(bk.providers) ? bk.providers[0] : bk.providers;
  const provUserId = (provSnap as Record<string, unknown> | null)?.user_id as string | null;

  const isOwner    = user.id === bk.owner_id;
  const isProvider = provUserId && user.id === provUserId;
  if (!isOwner && !isProvider) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // booking_request goes to provider; others go to owner
  const recipientUserId: string | null =
    type === "booking_request" ? provUserId : (bk.owner_id as string);

  if (!recipientUserId) return NextResponse.json({ ok: true });

  const base   = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";
  const secret = process.env.NOTIFICATIONS_WEBHOOK_SECRET ?? "";

  fetch(`${base}/api/notifications/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
    body: JSON.stringify({
      type: "INSERT",
      record: {
        user_id:    recipientUserId,
        booking_id: params.bookingId,
        type,
        message:    DEFAULT_MESSAGES[type],
      },
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
