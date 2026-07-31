import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Returns the raw rows needed to build the Users & Bookings report.
// The client (app/admin/report) turns these into the printable document.
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data: me } = await db.from("users").select("role").eq("id", user.id).single();
  if (!me || (me as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, providers, bookings, dogs, reviews] = await Promise.all([
    db.from("users").select("id,name,email,role,location,created_at,is_trainer,referred_by_provider_id,referred_by_code"),
    db.from("providers").select("id,user_id,verified,active,verification_status,provider_level"),
    db.from("bookings").select("id,owner_id,provider_id,dog_id,service_type,status,gross_amount,commission_amount,provider_payout,refund_amount,penalty_amount,created_at"),
    db.from("dogs").select("id,owner_id,name,breed,size,vaccination_status"),
    db.from("reviews").select("rating"),
  ]);

  const firstErr = [users, providers, bookings, dogs, reviews].find((r) => r.error);
  if (firstErr?.error) return NextResponse.json({ error: firstErr.error.message }, { status: 500 });

  return NextResponse.json({
    users: users.data ?? [],
    providers: providers.data ?? [],
    bookings: bookings.data ?? [],
    dogs: dogs.data ?? [],
    reviews: reviews.data ?? [],
    generatedAt: new Date().toISOString(),
  });
}
