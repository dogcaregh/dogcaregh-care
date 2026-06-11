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
  const sb = createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await db().from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const admin = db();

  const [metricsRes, snapshotsRes, incidentsRes] = await Promise.all([
    admin.rpc("get_metrics", { p_from: from, p_to: to }),
    admin
      .from("metric_snapshots")
      .select("week_start, metric_key, value, gate_status")
      .order("week_start", { ascending: true })
      .limit(32),
    admin
      .from("incidents")
      .select("id, created_at, type, booking_id, provider_id, description, status, resolved_at, resolution_notes")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (metricsRes.error) {
    return NextResponse.json({ error: metricsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...(metricsRes.data as object),
    snapshots: snapshotsRes.data ?? [],
    incidents: incidentsRes.data ?? [],
  });
}
