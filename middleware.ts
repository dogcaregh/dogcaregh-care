import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  sessionCookieOptions,
  cookieDomainForHost,
  isSupabaseAuthCookie,
  hasDuplicateAuthCookie,
  supabaseAuthCookieNames,
  DOMAIN_MIGRATION_COOKIE,
  domainMigrationCookieOptions,
} from "@/lib/cookie-domain";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl.startsWith("http") || !supabaseKey) {
    return supabaseResponse;
  }

  const migrationDomain = cookieDomainForHost(request.nextUrl.hostname);

  // Self-heal a corrupt DUPLICATE auth-cookie state. After the parent-domain
  // widening, a browser that logged in beforehand can carry BOTH a host-only and
  // a .dogcaregh.com cookie of the same name. @supabase/ssr can't reassemble the
  // duplicate chunked session, so getUser() loops on token refresh and trips
  // Supabase's per-IP rate limit ("request rate limit reached"), locking the user
  // out until they manually clear cookies. Next collapses same-named cookies in
  // its parsed map, so we read the raw Cookie header and, if a duplicate exists,
  // clear every sb-*-auth-token in BOTH scopes the current host can see and skip
  // the auth call entirely (no refresh, no rate-limit hit). Deliberately NOT
  // gated on the migration marker — the corrupt state can form after the marker
  // is set, which is precisely the case that locked mobile users out.
  const rawCookie = request.headers.get("cookie");
  if (migrationDomain && hasDuplicateAuthCookie(rawCookie)) {
    const names = supabaseAuthCookieNames(rawCookie);
    names.forEach((name) => request.cookies.delete(name));
    const res = NextResponse.next({ request });
    for (const name of names) {
      // Two Set-Cookie headers per name — one host-only, one parent-domain — so
      // both copies are removed. (ResponseCookies keys by name and can't emit
      // two same-named cookies, hence raw header appends.)
      res.headers.append("set-cookie", `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`);
      res.headers.append(
        "set-cookie",
        `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure; Domain=${migrationDomain}`,
      );
    }
    // Keep the one-time-migration marker set so the block below doesn't refire.
    res.headers.append(
      "set-cookie",
      `${DOMAIN_MIGRATION_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure; Domain=${migrationDomain}`,
    );
    return res;
  }

  // One-time parent-domain cookie migration. On a dogcaregh.com host, a user
  // who still carries a legacy *host-only* auth cookie (from before the domain
  // widening) would otherwise end up with two same-named cookies once we write
  // the .dogcaregh.com one — which makes @supabase/ssr fail to parse the
  // session. Clear the legacy cookie and mark the browser migrated, so they
  // re-login once cleanly. Runs before any .dogcaregh.com cookie is written,
  // so the two never coexist.
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
      res.cookies.set(
        DOMAIN_MIGRATION_COOKIE,
        "1",
        domainMigrationCookieOptions(migrationDomain)
      );
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

  // Stamp the migration marker for any already-clean browser on a dogcaregh.com
  // host (new users, or anyone with no legacy cookie). This ensures the block
  // above only ever fires for a genuine legacy host-only session — not for a
  // fresh .dogcaregh.com login that merely lacks the marker yet.
  if (migrationDomain && !request.cookies.get(DOMAIN_MIGRATION_COOKIE)) {
    supabaseResponse.cookies.set(
      DOMAIN_MIGRATION_COOKIE,
      "1",
      domainMigrationCookieOptions(migrationDomain)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
