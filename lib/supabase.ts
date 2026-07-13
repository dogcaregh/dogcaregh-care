"use client";

import { createBrowserClient } from "@supabase/ssr";
import { sessionCookieOptions } from "@/lib/cookie-domain";

// Safe to import from Client Components
export function createClient() {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: sessionCookieOptions(host) }
  );
}
