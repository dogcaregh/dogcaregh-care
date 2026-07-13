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
