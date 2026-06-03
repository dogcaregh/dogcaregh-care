import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify admin
  const { data: me } = await db.from("users").select("role").eq("id", user.id).single();
  if ((me as { role: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    { count: owners },
    { count: providers },
    { count: bookings },
    { count: pendingCashouts },
    { data: allBookings },
    { data: recentRaw },
  ] = await Promise.all([
    db.from("users").select("*", { count: "exact", head: true }).eq("role", "owner"),
    db.from("users").select("*", { count: "exact", head: true }).eq("role", "provider"),
    db.from("bookings").select("*", { count: "exact", head: true }),
    db.from("cashout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("bookings").select("status, gross_amount, commission_amount"),
    db.from("bookings").select(`
      id, service_type, status, gross_amount, commission_amount, created_at,
      owner:users!bookings_owner_id_fkey(name),
      provider:providers!bookings_provider_id_fkey(user:users!providers_user_id_fkey(name))
    `).order("created_at", { ascending: false }).limit(8),
  ]);

  const bks = allBookings ?? [];
  const closedBks = bks.filter((b: { status: string }) => b.status === "closed");
  const byStatus: Record<string, number> = {};
  for (const b of bks) byStatus[(b as { status: string }).status] = (byStatus[(b as { status: string }).status] ?? 0) + 1;

  return NextResponse.json({
    owners:           owners ?? 0,
    providers:        providers ?? 0,
    bookings:         bookings ?? 0,
    pendingCashouts:  pendingCashouts ?? 0,
    totalRevenue:     closedBks.reduce((s: number, b: Record<string, unknown>) => s + Number(b.gross_amount), 0),
    totalCommission:  closedBks.reduce((s: number, b: Record<string, unknown>) => s + Number(b.commission_amount), 0),
    bookingsByStatus: byStatus,
    recentBookings:   recentRaw ?? [],
  });
}
