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
        .select(
          `*,
           users!user_id(name),
           provider_services(service_type_id, rate_small, rate_medium, rate_large, is_active, availability)`
        )
        .eq("active", true)
        .order("rating_avg", { ascending: false })
        .limit(1000),
      db.from("service_types").select("id, slug, name").order("name"),
    ]);

  if (pvErr) {
    // availability column may not exist — retry without it
    const { data: providers2, error: pvErr2 } = await db
      .from("providers")
      .select(
        `*,
         users!user_id(name),
         provider_services(service_type_id, rate_small, rate_medium, rate_large, is_active)`
      )
      .eq("active", true)
      .order("rating_avg", { ascending: false })
      .limit(1000);

    if (pvErr2) {
      console.error("[providers API] error:", pvErr2);
      return NextResponse.json({ error: pvErr2.message }, { status: 500 });
    }

    return NextResponse.json({
      providers: providers2 ?? [],
      serviceTypes: serviceTypes ?? [],
    });
  }

  return NextResponse.json({
    providers: providers ?? [],
    serviceTypes: serviceTypes ?? [],
  });
}
