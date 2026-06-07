import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                             changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/search`,                 changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/how-it-works`,           changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/register/owner`,         changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/register/provider`,      changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/faq`,                    changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/contact`,                changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`,                  changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/privacy`,                changeFrequency: "yearly",  priority: 0.3 },
  ];

  let providerPages: MetadataRoute.Sitemap = [];
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await sb
      .from("providers")
      .select("id")
      .eq("active", true);

    providerPages = (data ?? []).map(p => ({
      url: `${BASE}/provider/${p.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // non-fatal — sitemap still returns static pages
  }

  return [...staticPages, ...providerPages];
}
