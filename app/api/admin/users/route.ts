import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use service role for all DB reads to bypass RLS
  const db = admin();
  const { data: me } = await db.from("users").select("role").eq("id", user.id).single();
  if (!me || (me as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [{ data: users }, { data: providers }] = await Promise.all([
    db.from("users").select("id, name, email, role, phone, created_at").neq("role", "admin").order("created_at", { ascending: false }),
    db.from("providers").select("id, user_id, verified, active, rating_avg, review_count"),
  ]);

  return NextResponse.json({ users: users ?? [], providers: providers ?? [] });
}
