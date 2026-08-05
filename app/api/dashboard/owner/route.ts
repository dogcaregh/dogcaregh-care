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

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = db();

  const [{ data: owner }, { data: bookings }] = await Promise.all([
    service
      .from("users")
      .select("name, avatar_url, location, referred_by_code, referred_by_provider_id")
      .eq("id", user.id)
      .single(),
    service
      .from("bookings")
      .select(
        `id, service_type, start_date, end_date, gross_amount, status, created_at,
         providers!provider_id(id, neighbourhood, avatar_url, user_id, users!user_id(name)),
         dogs!dog_id(name)`
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Resolve who referred this owner (if anyone), for a "referred by" badge.
  let referredBy: { code: string | null; providerId: string; providerName: string | null } | null = null;
  const oRow = owner as { referred_by_code?: string | null; referred_by_provider_id?: string | null } | null;
  if (oRow?.referred_by_provider_id) {
    const { data: prov } = await service
      .from("providers")
      .select("id, users!user_id(name)")
      .eq("id", oRow.referred_by_provider_id)
      .maybeSingle();
    const provUsers = (prov as unknown as { users?: { name: string } | { name: string }[] | null } | null)?.users;
    const provUser = Array.isArray(provUsers) ? (provUsers[0] ?? null) : (provUsers ?? null);
    referredBy = {
      code: oRow.referred_by_code ?? null,
      providerId: oRow.referred_by_provider_id,
      providerName: provUser?.name ?? null,
    };
  }

  return NextResponse.json({
    owner: owner ?? null,
    bookings: bookings ?? [],
    referredBy,
  });
}
