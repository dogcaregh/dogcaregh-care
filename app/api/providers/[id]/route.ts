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
       neighbourhood, years_experience, avatar_url, gallery_photos, blocked_dates,
       users!user_id(name)`
    )
    .eq("id", id)
    .single();

  if (pvErr || !provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const [
    { data: serviceTypes },
    { data: svcsRaw, error: svcsErr },
    { data: reviews },
    { data: discountTiers },
    { data: addons },
  ] = await Promise.all([
    supabase.from("service_types").select("id, slug, name, rate_unit"),
    supabase
      .from("provider_services")
      .select("id, service_type_id, rate_small, rate_medium, rate_large, rate_half_small, rate_half_medium, rate_half_large, grooming_mode, is_active, availability")
      .in("provider_id", [id]),
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

  if (svcsErr) {
    console.error("[provider/:id] provider_services query error:", svcsErr);
  }

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
        grooming_subs: [] as {
          id: string; name: string;
          rate_small: number | null; rate_medium: number | null; rate_large: number | null;
        }[],
      };
    });

  // Itemised grooming: attach each grooming service's sub-service menu so the
  // booking rate card can show the provider's per-item prices.
  const groomingIds = activeSvcs
    .filter((s) => s.service_types.slug === "dog_grooming")
    .map((s) => s.id);
  if (groomingIds.length > 0) {
    const { data: subs } = await supabase
      .from("grooming_sub_services")
      .select("id, provider_service_id, name, rate_small, rate_medium, rate_large")
      .in("provider_service_id", groomingIds)
      .eq("is_active", true);
    for (const svc of activeSvcs) {
      svc.grooming_subs = (subs ?? [])
        .filter((ss) => ss.provider_service_id === svc.id)
        .map(({ id, name, rate_small, rate_medium, rate_large }) => ({
          id, name, rate_small, rate_medium, rate_large,
        }));
    }
  }

  return NextResponse.json(
    {
      provider,
      services: activeSvcs,
      reviews: reviews ?? [],
      discountTiers: discountTiers ?? [],
      addons: addons ?? [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
