// Host-aware cookie domain for the shared Supabase session.
//
// Phase 1 (subdomain SSO): to let a session set on dogcaregh.com be readable at
// train.dogcaregh.com, the auth cookie must be scoped to the parent domain.
// But this can ONLY be done on real dogcaregh.com hosts — a response served
// from a *.vercel.app preview (or localhost) cannot set a cookie for
// dogcaregh.com; the browser silently drops it and auth breaks. So we widen the
// scope only when the request host is within dogcaregh.com, and otherwise return
// undefined to keep the cookie host-only (the current, safe default).

const PARENT_DOMAIN = "dogcaregh.com";

/**
 * Returns the cookie `Domain` to use for a given request host, or `undefined`
 * to leave the cookie host-only.
 *
 * - `dogcaregh.com`, `www.dogcaregh.com`, `train.dogcaregh.com`,
 *   `preview.dogcaregh.com`, … → `"dogcaregh.com"` (shared across subdomains)
 * - `*.vercel.app`, `localhost`, IPs, anything else → `undefined` (host-only)
 */
export function cookieDomainForHost(
  host: string | null | undefined
): string | undefined {
  if (!host) return undefined;
  const hostname = host.split(":")[0].trim().toLowerCase(); // strip any :port
  if (hostname === PARENT_DOMAIN || hostname.endsWith(`.${PARENT_DOMAIN}`)) {
    return PARENT_DOMAIN;
  }
  return undefined;
}

/**
 * Builds the `cookieOptions` object for the Supabase SSR clients. Only sets
 * `domain` when the host warrants it, so on preview/localhost we pass an empty
 * object and the library keeps its host-only defaults (sameSite=lax, secure).
 */
export function sessionCookieOptions(
  host: string | null | undefined
): { domain?: string } {
  const domain = cookieDomainForHost(host);
  return domain ? { domain } : {};
}

/**
 * Marker cookie set once per browser after the parent-domain migration has run,
 * so we don't repeatedly clear a user's session. Deliberately does NOT contain
 * "-auth-token" so isSupabaseAuthCookie() never matches it.
 */
export const DOMAIN_MIGRATION_COOKIE = "sb-domain-migrated";

/**
 * True for any Supabase SSR auth cookie: the session token, its numbered chunks
 * (`…-auth-token.0`, `.1`), and the PKCE `…-auth-token-code-verifier`.
 */
export function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

/**
 * Cookie names in a raw `Cookie` request header, preserving duplicates. Next's
 * parsed `request.cookies` collapses same-named cookies into one entry, so the
 * host-only-vs-parent-domain duplicate (same name, two scopes) is only visible
 * in the raw header.
 */
export function rawCookieNames(rawCookie: string | null | undefined): string[] {
  if (!rawCookie) return [];
  return rawCookie
    .split(";")
    .map((pair) => pair.split("=")[0].trim())
    .filter(Boolean);
}

/**
 * True when a Supabase auth cookie appears more than once in the raw header —
 * i.e. the browser holds both a host-only and a `.dogcaregh.com` copy of the
 * same cookie. `@supabase/ssr` cannot reassemble that duplicate chunked session,
 * which sends the client into a token-refresh loop that trips Supabase's per-IP
 * auth rate limit. Detecting it lets the middleware self-heal by clearing both.
 */
export function hasDuplicateAuthCookie(rawCookie: string | null | undefined): boolean {
  const seen = new Set<string>();
  for (const name of rawCookieNames(rawCookie)) {
    if (!isSupabaseAuthCookie(name)) continue;
    if (seen.has(name)) return true;
    seen.add(name);
  }
  return false;
}

/** Distinct Supabase auth cookie names present in a raw `Cookie` header. */
export function supabaseAuthCookieNames(rawCookie: string | null | undefined): string[] {
  return Array.from(new Set(rawCookieNames(rawCookie).filter(isSupabaseAuthCookie)));
}

/** Cookie options for the one-time parent-domain migration marker. */
export function domainMigrationCookieOptions(domain: string) {
  return {
    domain,
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax" as const,
    secure: true,
  };
}
