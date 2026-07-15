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

  const [{ data: allRows, error: pvErr }, { data: serviceTypes }] =
    await Promise.all([
      db
        .from("providers")
        .select("*")
        .order("rating_avg", { ascending: false })
        .limit(1000),
      db.from("service_types").select("id, slug, name").order("name"),
    ]);

  // Filter active + verified in JS rather than with chained boolean .eq()
  // filters. On the production deployment those PostgREST filters intermittently
  // dropped freshly-verified rows — the two most-recently-approved providers were
  // silently excluded (no error) while the identical query returned them in every
  // other environment, same project and same service_role key. The provider set
  // is small, so fetching it whole and filtering here is deterministic and immune
  // to that quirk. See commit f68dc5b for the sibling .eq()->.in() fix.
  const providers = (allRows ?? []).filter(
    (p) => p.active === true && p.verified === true,
  );

  if (pvErr) {
    console.error("[providers API] error:", pvErr);
    return NextResponse.json({ error: pvErr.message }, { status: 500 });
  }

  if (providers.length === 0) {
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
