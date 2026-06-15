import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { lookupCoords } from "@/lib/geocode";

const serviceDb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meta = user.user_metadata as {
    name?: string; phone?: string; neighbourhood?: string; role?: string;
  };

  if (meta.role !== "provider") {
    return NextResponse.json({ error: "Not a provider account" }, { status: 403 });
  }

  const name         = meta.name         ?? "";
  const phone        = meta.phone        ?? "";
  const neighbourhood = meta.neighbourhood ?? "";

  const service = serviceDb();

  await service.from("users").upsert({
    id: user.id, email: user.email, name, phone,
    role: "provider", location: neighbourhood,
  });

  const { data: existing } = await service
    .from("providers").select("id").eq("user_id", user.id).maybeSingle();

  if (!existing) {
    const coords = lookupCoords(neighbourhood.trim());
    await service.from("providers").insert({
      user_id: user.id, neighbourhood, location: neighbourhood,
      active: true, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
