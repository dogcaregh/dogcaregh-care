import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function GET() {
  const db = serviceRole();

  const [{ data: providers, error: pvErr }, { data: serviceTypes }] =
    await Promise.all([
      db
        .from("providers")
        .select("*")
        .eq("active", true)
        .eq("verified", true)
        .order("rating_avg", { ascending: false })
        .limit(1000),
      db.from("service_types").select("id, slug, name").order("name"),
    ]);

  if (pvErr) {
    console.error("[providers API] error:", pvErr);
    return NextResponse.json({ error: pvErr.message }, { status: 500 });
  }

  if (!providers || providers.length === 0) {
    return NextResponse.json(
      { providers: [], serviceTypes: serviceTypes ?? [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Fetch user names and provider services separately to avoid PostgREST
  // column-name collision between providers.availability and
  // provider_services.availability when using embedded resource syntax.
  const userIds      = providers.map((p) => p.user_id);
  const providerIds  = providers.map((p) => p.id);

  const [{ data: users }, { data: services }] = await Promise.all([
    db.from("users").select("id, name").in("id", userIds),
    db
      .from("provider_services")
      .select("provider_id, service_type_id, rate_small, rate_medium, rate_large, is_active, availability")
      .in("provider_id", providerIds),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const servicesMap = new Map<string, unknown[]>();
  for (const s of services ?? []) {
    const arr = servicesMap.get(s.provider_id) ?? [];
    arr.push(s);
    servicesMap.set(s.provider_id, arr);
  }

  const enriched = providers.map((p) => ({
    ...p,
    users: userMap.get(p.user_id) ?? null,
    provider_services: servicesMap.get(p.id) ?? [],
  }));

  return NextResponse.json(
    { providers: enriched, serviceTypes: serviceTypes ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
