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

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await db()
    .from("cashout_requests")
    .select(`
      id, amount, momo_network, momo_number, status, note, created_at, paid_at, provider_id,
      providers!provider_id(user_id, users!user_id(name, email))
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cashouts: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status, note } = await req.json();
  if (!id || !["paid", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const service = db();

  // Fetch row so we have amount + provider contact info
  const { data: row, error: rowErr } = await service
    .from("cashout_requests")
    .select(`
      id, amount,
      providers!provider_id(user_id, users!user_id(name, email))
    `)
    .eq("id", id)
    .single();

  if (rowErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update cashout request
  const patch: Record<string, unknown> = {
    status,
    note: note?.trim() || null,
  };
  if (status === "paid") patch.paid_at = new Date().toISOString();

  const { error: updateErr } = await service.from("cashout_requests").update(patch).eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Resolve provider contact
  const provSnap   = Array.isArray(row.providers) ? row.providers[0] : row.providers;
  const provUserId = (provSnap as { user_id: string } | null)?.user_id ?? null;

  if (provUserId) {
    const amount  = `GHS ${Number(row.amount).toFixed(2)}`;
    const noteStr = note?.trim() ? ` ${status === "paid" ? "Note" : "Reason"}: ${note.trim()}` : "";

    const message = status === "paid"
      ? `Your withdrawal of ${amount} has been sent to your mobile money account.${noteStr}`
      : `Your withdrawal request of ${amount} was not approved.${noteStr}`;

    // In-app notification
    await service.from("notifications").insert({
      user_id:    provUserId,
      booking_id: null,
      type:       status === "paid" ? "cashout_paid" : "cashout_rejected",
      message,
    });

    // Email notification (fire-and-forget)
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";
    fetch(`${base}/api/notifications/email`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": process.env.NOTIFICATIONS_WEBHOOK_SECRET ?? "" },
      body: JSON.stringify({
        type:   "INSERT",
        record: {
          user_id:    provUserId,
          booking_id: null,
          type:       status === "paid" ? "cashout_paid" : "cashout_rejected",
          message,
        },
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
