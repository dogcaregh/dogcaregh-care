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

const DISPUTE_SELECT = `
  id, reason, description, status, admin_note, created_at, resolved_at,
  booking_id,
  bookings!booking_id(
    id, service_type, gross_amount, start_date, status,
    users!owner_id(name),
    providers!provider_id(users!user_id(name))
  ),
  users!raised_by(name)
`;

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") ?? "open";

  const base  = db().from("disputes").select(DISPUTE_SELECT).order("created_at", { ascending: false });
  const query = status === "all" ? base : base.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ disputes: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status, admin_note } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const resolved = ["resolved_no_action", "resolved_refund", "dismissed"].includes(status);

  const { error } = await db()
    .from("disputes")
    .update({
      status,
      admin_note:  admin_note?.trim() || null,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
