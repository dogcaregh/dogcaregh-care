import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const SERVICE_LABELS: Record<string, string> = {
  dog_walking:     "Dog Walking",
  pet_sitting:     "Dog Sitting",
  doggy_daycare:   "Dog Daycare",
  dog_boarding:    "Dog Overnight",
  mobile_grooming: "Dog Grooming",
};

const MOMO_LABELS: Record<string, string> = {
  mtn:         "MTN MoMo",
  vodafone:    "Telecel Cash",
  airtel_tigo: "AirtelTigo Money",
};

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

  const [{ data: bookings }, { data: cashouts }] = await Promise.all([
    db.from("bookings")
      .select(`
        id, service_type, gross_amount, commission_amount, provider_payout,
        payment_ref, status, created_at,
        owner:users!bookings_owner_id_fkey(name),
        provider:providers!bookings_provider_id_fkey(user:users!providers_user_id_fkey(name))
      `)
      .in("status", ["paid", "in_progress", "completed_pending", "closed"])
      .order("created_at", { ascending: false }),
    db.from("cashout_requests")
      .select(`
        id, amount, momo_network, momo_number, status, created_at, paid_at,
        providers!provider_id(user:users!providers_user_id_fkey(name))
      `)
      .order("created_at", { ascending: false }),
  ]);

  // Normalise into a unified transaction feed
  const payments = (bookings ?? []).map((b: Record<string, unknown>) => ({
    id:        b.id as string,
    type:      "payment" as const,
    date:      b.created_at as string,
    amount:    Number(b.gross_amount),
    commission:Number(b.commission_amount),
    payout:    Number(b.provider_payout),
    status:    b.status as string,
    ref:       (b.payment_ref as string | null) ?? null,
    service:   SERVICE_LABELS[(b.service_type as string)] ?? (b.service_type as string),
    from:      ((b.owner as Record<string, unknown> | null)?.name as string) ?? "—",
    to:        (((b.provider as Record<string, unknown> | null)?.user as Record<string, unknown> | null)?.name as string) ?? "—",
    bookingId: b.id as string,
  }));

  const payouts = (cashouts ?? []).map((c: Record<string, unknown>) => ({
    id:        c.id as string,
    type:      "cashout" as const,
    date:      c.created_at as string,
    amount:    Number(c.amount),
    commission:0,
    payout:    Number(c.amount),
    status:    c.status as string,
    ref:       `${MOMO_LABELS[(c.momo_network as string)] ?? c.momo_network} · ${c.momo_number}`,
    service:   "Withdrawal",
    from:      "Platform",
    to:        (((c.providers as Record<string, unknown> | null)?.user as Record<string, unknown> | null)?.name as string) ?? "—",
    bookingId: null,
  }));

  // Merge and sort by date descending
  const all = [...payments, ...payouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalIn       = payments.reduce((s, p) => s + p.amount, 0);
  const totalOut      = payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalCommission = payments.reduce((s, p) => s + p.commission, 0);

  return NextResponse.json({ transactions: all, totalIn, totalOut, totalCommission });
}
