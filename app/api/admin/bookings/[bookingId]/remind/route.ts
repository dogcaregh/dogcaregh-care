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

// Auto-generated reminder per booking status: who has the pending action,
// and the nudge they receive. Statuses with no pending action return null.
function pendingAction(
  status: string,
  ownerUserId: string,
  providerUserId: string | null,
): { recipient: string; target: "owner" | "provider"; message: string } | null {
  switch (status) {
    case "pending":
      return providerUserId
        ? { recipient: providerUserId, target: "provider", message: "A booking request is waiting for your response. Please accept or decline it." }
        : null;
    case "confirmed":
      return { recipient: ownerUserId, target: "owner", message: "Your booking was accepted. Please complete payment to confirm it." };
    case "paid":
      return providerUserId
        ? { recipient: providerUserId, target: "provider", message: "Payment received for this booking. Please start the service at the scheduled time." }
        : null;
    case "in_progress":
      return providerUserId
        ? { recipient: providerUserId, target: "provider", message: "Please mark this service as complete once it's done." }
        : null;
    case "completed_pending":
      return { recipient: ownerUserId, target: "owner", message: "Please confirm the service is complete so the provider can be paid." };
    default:
      return null; // closed / cancelled — nothing pending
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = db();
  const { bookingId } = params;

  const { data: booking } = await service
    .from("bookings")
    .select("id, status, owner_id, providers!provider_id(user_id)")
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bk = booking as Record<string, unknown>;
  const provSnap = Array.isArray(bk.providers) ? bk.providers[0] : bk.providers;
  const provUserId = (provSnap as Record<string, unknown> | null)?.user_id as string | null;

  const action = pendingAction(bk.status as string, bk.owner_id as string, provUserId);
  if (!action) {
    return NextResponse.json({ ok: false, reason: "no_pending_action" });
  }

  // In-app notification (shows in the recipient's bell).
  await service.from("notifications").insert({
    user_id:    action.recipient,
    booking_id: bookingId,
    type:       "reminder",
    message:    action.message,
  });

  // Email reminder (best-effort — mirrors the email-trigger route).
  const base   = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";
  const secret = process.env.NOTIFICATIONS_WEBHOOK_SECRET ?? "";
  await fetch(`${base}/api/notifications/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
    body: JSON.stringify({
      type: "INSERT",
      record: { user_id: action.recipient, booking_id: bookingId, type: "reminder", message: action.message },
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, target: action.target });
}
