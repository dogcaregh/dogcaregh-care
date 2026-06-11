import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { lookupCoords } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const metaRole = user?.user_metadata?.role as string | undefined;

      if (metaRole === "provider" && user) {
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const meta = user.user_metadata as { name?: string; phone?: string; neighbourhood?: string };
        const name         = meta.name         ?? "";
        const phone        = meta.phone        ?? "";
        const neighbourhood = meta.neighbourhood ?? "";

        await admin.from("users").upsert({
          id: user.id, email: user.email, name, phone,
          role: "provider", location: neighbourhood,
        });

        const { data: existing } = await admin
          .from("providers").select("id").eq("user_id", user.id).maybeSingle();

        if (!existing) {
          const coords = lookupCoords(neighbourhood.trim());
          await admin.from("providers").insert({
            user_id: user.id, neighbourhood, location: neighbourhood,
            active: true, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
          });
        }

        return NextResponse.redirect(`${origin}/dashboard/provider/services`);
      }

      return NextResponse.redirect(`${origin}${next !== "/" ? next : "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
