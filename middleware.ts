import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  sessionCookieOptions,
  cookieDomainForHost,
  isSupabaseAuthCookie,
  DOMAIN_MIGRATION_COOKIE,
} from "@/lib/cookie-domain";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl.startsWith("http") || !supabaseKey) {
    return supabaseResponse;
  }

  // One-time parent-domain cookie migration. On a dogcaregh.com host, a user
  // who still carries a legacy *host-only* auth cookie (from before the domain
  // widening) would otherwise end up with two same-named cookies once we write
  // the .dogcaregh.com one — which makes @supabase/ssr fail to parse the
  // session. Clear the legacy cookie and mark the browser migrated, so they
  // re-login once cleanly. Runs before any .dogcaregh.com cookie is written,
  // so the two never coexist.
  const migrationDomain = cookieDomainForHost(request.nextUrl.hostname);
  if (migrationDomain && !request.cookies.get(DOMAIN_MIGRATION_COOKIE)) {
    const legacyAuthCookies = request.cookies
      .getAll()
      .filter((c) => isSupabaseAuthCookie(c.name));
    if (legacyAuthCookies.length > 0) {
      // Render this request unauthenticated (the legacy session is being retired).
      legacyAuthCookies.forEach((c) => request.cookies.delete(c.name));
      const res = NextResponse.next({ request });
      // Delete the legacy host-only cookie in the browser (no domain => host-only).
      legacyAuthCookies.forEach((c) =>
        res.cookies.set(c.name, "", { path: "/", maxAge: 0 })
      );
      // Mark migrated at the parent domain so no subdomain re-triggers this.
      res.cookies.set(DOMAIN_MIGRATION_COOKIE, "1", {
        domain: migrationDomain,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: true,
      });
      return res;
    }
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: sessionCookieOptions(request.nextUrl.hostname),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        // Forward cache-control headers required by @supabase/ssr to
        // prevent Vercel Edge from caching auth cookie responses.
        if (responseHeaders) {
          Object.entries(responseHeaders).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        }
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
