import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SLUG_EMOJI: Record<string, string> = {
  dog_walking: "🦮", dog_sitting: "🐾", dog_daycare: "🏡",
  dog_boarding: "🛏️", dog_grooming: "✂️",
};

const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = db();
  const { id } = params;

  const { data: provider, error: pvErr } = await supabase
    .from("providers")
    .select(
      `id, user_id, bio, rating_avg, review_count, verified, active,
       neighbourhood, years_experience, avatar_url, gallery_photos,
       users!user_id(name)`
    )
    .eq("id", id)
    .eq("active", true)
    .single();

  if (pvErr || !provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const [
    { data: serviceTypes },
    { data: svcsRaw },
    { data: reviews },
    { data: discountTiers },
    { data: addons },
  ] = await Promise.all([
    supabase.from("service_types").select("id, slug, name, rate_unit"),
    supabase
      .from("provider_services")
      .select("id, service_type_id, rate_small, rate_medium, rate_large, rate_half_small, rate_half_medium, rate_half_large, grooming_mode, is_active, availability")
      .eq("provider_id", id),
    supabase
      .from("reviews")
      .select("id, rating, body, created_at, users!from_user_id(name)")
      .eq("to_user_id", provider.user_id)
      .eq("from_role", "owner")
      .order("created_at", { ascending: false }),
    supabase
      .from("provider_discount_tiers")
      .select("id, service_type_id, discount_type, threshold, percentage")
      .eq("provider_id", id),
    supabase
      .from("provider_addons")
      .select("id, name, description, price")
      .eq("provider_id", id)
      .eq("is_active", true),
  ]);

  const activeSvcs = (svcsRaw ?? [])
    .filter((s) => s.is_active)
    .map((s) => {
      const st = (serviceTypes ?? []).find((t) => t.id === s.service_type_id);
      const slug = st?.slug ?? "";
      return {
        ...s,
        service_types: {
          slug,
          name: st?.name ?? "Service",
          emoji: SLUG_EMOJI[slug] ?? "🐾",
          rate_unit: st?.rate_unit ?? "",
        },
      };
    });

  return NextResponse.json({
    provider,
    services: activeSvcs,
    reviews: reviews ?? [],
    discountTiers: discountTiers ?? [],
    addons: addons ?? [],
  });
}
