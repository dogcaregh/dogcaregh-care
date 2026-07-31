import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export function serviceDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Verifies the caller is an admin. Returns a service-role client either way.
export async function requireAdmin(): Promise<{ ok: boolean; userId?: string; email?: string; db: SupabaseClient }> {
  const db = serviceDb();
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, db };
  const { data } = await db.from("users").select("role").eq("id", user.id).single();
  return { ok: (data as { role?: string } | null)?.role === "admin", userId: user.id, email: user.email ?? undefined, db };
}
