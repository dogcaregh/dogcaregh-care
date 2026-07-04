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

type Referral = {
  id: string;
  referrer_provider_id: string;
  referrer_user_id: string;
  referee_user_id: string;
  referral_code: string;
  created_at: string;
  expires_at: string;
};

type Earning = {
  referral_id: string;
  referrer_provider_id: string;
  reward_amount: number;
  status: "accrued" | "earned" | "paid" | "void";
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = db();

  const { data: me } = await service.from("users").select("role").eq("id", user.id).single();
  if ((me as { role: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: referralsRaw }, { data: earningsRaw }, { data: cashoutsRaw }] = await Promise.all([
    service.from("referrals").select(
      "id, referrer_provider_id, referrer_user_id, referee_user_id, referral_code, created_at, expires_at"
    ),
    service.from("referral_earnings").select("referral_id, referrer_provider_id, reward_amount, status"),
    service.from("cashout_requests").select("amount, status").eq("source", "referral"),
  ]);

  const referrals = (referralsRaw ?? []) as Referral[];
  const earnings  = (earningsRaw ?? []) as Earning[];
  const cashouts  = (cashoutsRaw ?? []) as { amount: number; status: string }[];

  // Resolve referrer/referee display names in one query.
  const userIds = Array.from(new Set(referrals.flatMap(r => [r.referrer_user_id, r.referee_user_id])));
  const { data: usersRaw } = userIds.length
    ? await service.from("users").select("id, name").in("id", userIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = Object.fromEntries((usersRaw ?? []).map(u => [u.id, u.name]));

  // Top-line totals.
  const sum = (list: Earning[]) => list.reduce((s, e) => s + Number(e.reward_amount), 0);
  const totalAccrued = sum(earnings.filter(e => e.status === "accrued"));
  const totalEarned  = sum(earnings.filter(e => e.status === "earned"));
  const totalVoided  = sum(earnings.filter(e => e.status === "void"));

  const activeReferralIds = new Set(
    earnings.filter(e => e.status !== "void").map(e => e.referral_id)
  );
  const totalReferrals = referrals.length;
  const convertedCount = activeReferralIds.size;
  const conversionRate = totalReferrals > 0 ? convertedCount / totalReferrals : 0;

  const cashoutPaid    = cashouts.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const cashoutPending = cashouts.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);

  // Per-provider leaderboard.
  type Row = { providerId: string; name: string; referrals: number; active: number; earned: number; accrued: number };
  const byProvider: Record<string, Row> = {};
  for (const r of referrals) {
    const row = byProvider[r.referrer_provider_id] ??= {
      providerId: r.referrer_provider_id,
      name: nameById[r.referrer_user_id] ?? "Provider",
      referrals: 0, active: 0, earned: 0, accrued: 0,
    };
    row.referrals++;
  }
  const activeByProvider: Record<string, Set<string>> = {};
  for (const e of earnings) {
    const row = byProvider[e.referrer_provider_id];
    if (!row) continue;
    if (e.status === "earned") row.earned += Number(e.reward_amount);
    if (e.status === "accrued") row.accrued += Number(e.reward_amount);
    if (e.status !== "void") {
      (activeByProvider[e.referrer_provider_id] ??= new Set()).add(e.referral_id);
    }
  }
  for (const pid of Object.keys(byProvider)) {
    byProvider[pid].active = activeByProvider[pid]?.size ?? 0;
  }
  const leaderboard = Object.values(byProvider)
    .sort((a, b) => b.earned - a.earned || b.referrals - a.referrals)
    .slice(0, 25);

  return NextResponse.json({
    totalReferrals,
    convertedCount,
    conversionRate,
    totalAccrued,
    totalEarned,
    totalVoided,
    cashoutPaid,
    cashoutPending,
    leaderboard,
  });
}
