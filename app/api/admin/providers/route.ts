import { NextResponse } from "next/server";
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

  const service = db();

  const [{ data: providers }, { data: bookings }, { data: cashouts }] = await Promise.all([
    service
      .from("providers")
      .select("id, user_id, verified, active, rating_avg, review_count, users!user_id(name, email)"),
    service
      .from("bookings")
      .select("provider_id, status, provider_payout"),
    service
      .from("cashout_requests")
      .select("provider_id, amount")
      .eq("status", "paid")
      .eq("source", "earnings"),
  ]);

  // Aggregate bookings per provider
  const bookingAgg = new Map<string, { total: number; completed: number; earned: number }>();
  for (const b of bookings ?? []) {
    if (!b.provider_id) continue;
    const cur = bookingAgg.get(b.provider_id) ?? { total: 0, completed: 0, earned: 0 };
    cur.total++;
    if (b.status === "closed") {
      cur.completed++;
      cur.earned += Number(b.provider_payout ?? 0);
    }
    bookingAgg.set(b.provider_id, cur);
  }

  // Aggregate paid-out cashouts per provider
  const cashedOutAgg = new Map<string, number>();
  for (const c of cashouts ?? []) {
    if (!c.provider_id) continue;
    cashedOutAgg.set(c.provider_id, (cashedOutAgg.get(c.provider_id) ?? 0) + Number(c.amount));
  }

  const result = (providers ?? []).map(p => {
    const agg      = bookingAgg.get(p.id) ?? { total: 0, completed: 0, earned: 0 };
    const cashedOut = cashedOutAgg.get(p.id) ?? 0;
    const user      = Array.isArray(p.users) ? p.users[0] : p.users;
    return {
      id:                 p.id,
      user_id:            p.user_id,
      name:               (user as { name: string }  | null)?.name  ?? "—",
      email:              (user as { email: string } | null)?.email ?? "—",
      verified:           p.verified,
      active:             p.active,
      rating_avg:         p.rating_avg,
      review_count:       p.review_count,
      total_bookings:     agg.total,
      completed_sessions: agg.completed,
      total_earned:       agg.earned,
      total_cashed_out:   cashedOut,
      balance:            agg.earned - cashedOut,
    };
  });

  result.sort((a, b) => b.balance - a.balance);

  return NextResponse.json({ providers: result });
}
