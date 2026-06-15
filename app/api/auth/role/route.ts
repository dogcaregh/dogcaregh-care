import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { lookupCoords } from "@/lib/geocode";

export const dynamic = "force-dynamic";

const serviceDb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ role: "guest" });

  const service = serviceDb();
  const [{ data: userRow }, { data: provRow }] = await Promise.all([
    service.from("users").select("role").eq("id", user.id).single(),
    service.from("providers").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const dbRole = (userRow as { role: string } | null)?.role;
  const metaRole = user.user_metadata?.role as string | undefined;

  // If the user signed up as a provider but DB rows are missing or have the wrong
  // role (e.g. the callback failed or RLS blocked the write), fix them now using
  // the service role so login always lands on the correct dashboard.
  if (metaRole === "provider" && (dbRole !== "provider" || !provRow)) {
    const meta = user.user_metadata as { name?: string; phone?: string; neighbourhood?: string };
    const name         = meta.name         ?? "";
    const phone        = meta.phone        ?? "";
    const neighbourhood = meta.neighbourhood ?? "";

    await service.from("users").upsert({
      id: user.id, email: user.email, name, phone,
      role: "provider", location: neighbourhood,
    });

    if (!provRow) {
      const coords = lookupCoords(neighbourhood.trim());
      await service.from("providers").insert({
        user_id: user.id, neighbourhood, location: neighbourhood,
        active: true, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      });
    }

    return NextResponse.json({ role: "provider", isAdmin: false, isProvider: true });
  }

  const role = dbRole ?? "owner";
  return NextResponse.json({
    role,
    isAdmin: role === "admin",
    isProvider: !!provRow,
  });
}
