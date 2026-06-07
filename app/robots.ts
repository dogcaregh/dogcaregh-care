import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/admin/",
        "/booking/",
        "/book/",
        "/auth/",
        "/api/",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
