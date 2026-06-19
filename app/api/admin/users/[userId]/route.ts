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

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = params;

  const [{ data: user, error }, { data: dogs }] = await Promise.all([
    db().from("users").select("id, name, email, phone, location, avatar_url, role, created_at").eq("id", userId).single(),
    db().from("dogs").select("id, name, breed, size, age, vaccination_status, neutered, leash_trained, temperament, diet_preference, allergies, bio, avatar_url").eq("owner_id", userId).order("created_at"),
  ]);

  if (error || !user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ user, dogs: dogs ?? [] });
}
