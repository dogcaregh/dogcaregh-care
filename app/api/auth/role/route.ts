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
  if (!user) return NextResponse.json({ role: "guest" });

  const service = db();
  const [{ data: userRow }, { data: provRow }] = await Promise.all([
    service.from("users").select("role").eq("id", user.id).single(),
    service.from("providers").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const role = (userRow as { role: string } | null)?.role ?? "owner";
  return NextResponse.json({
    role,
    isAdmin: role === "admin",
    isProvider: !!provRow,
  });
}
