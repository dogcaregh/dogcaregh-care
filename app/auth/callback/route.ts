import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { lookupCoords } from "@/lib/geocode";
import { Resend } from "resend";
import { renderDogCareEmail } from "@/lib/dogCareEmail";
import { sessionCookieOptions } from "@/lib/cookie-domain";

const FROM = "DogCareGH <noreply@dogcaregh.com>";
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dogcaregh.com";

/**
 * Validate an optional post-signup return URL. Only allow absolute https URLs
 * on dogcaregh.com or its subdomains (e.g. train.dogcaregh.com) so a new owner
 * arriving from the trainer app is bounced back there after confirming. Any
 * other value is rejected to prevent an open redirect.
 */
function safeReturnTo(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase();
    if (h === "dogcaregh.com" || h.endsWith(".dogcaregh.com")) return u.toString();
    return null;
  } catch {
    return null;
  }
}

async function sendOwnerWelcomeEmail(email: string, firstName: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const intro = `Hi ${firstName},<br><br>
Welcome to DogCareGH! We're so glad to have you with us. You've just joined Ghana's first managed pet care community, where trusted, vetted providers handle everything from a quick walk to overnight care.<br><br>
There are just two quick things to do before the fun part — and both take only a couple of minutes.<br><br>
<strong style="color:#103d36;">1. Set up your own profile.</strong><br>
Add a profile picture and, importantly, a phone number you can be reached on. That way, if there's ever a challenge, our admin team can reach out and help you quickly.<br><br>
<strong style="color:#103d36;">2. Add your dog's profile.</strong><br>
Once you've added your dog, head to your dashboard and click on your dog — their profile will pop up. Click <strong>Edit Profile</strong> and add:<br><br>
&bull;&nbsp; A lovely photo<br>
&bull;&nbsp; Their personality and temperament<br>
&bull;&nbsp; Food preferences and any routines<br>
&bull;&nbsp; Vaccination status<br><br>
Then click <strong>Save Changes</strong> (don't forget this step!).<br><br>
That's it — you can then book any of our services straight away: dog walking, mobile grooming, dog sitting, doggy daycare, or overnight care. No waiting, no back-and-forth.<br><br>
Welcome aboard,<br>
<strong>The DogCareGH Team</strong>`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to DogCareGH — let's get you set up 🐾",
    html: renderDogCareEmail({
      preheader: "You've joined Ghana's first managed pet care community — two quick steps to get started.",
      heading: "Welcome to DogCareGH 🐾",
      intro,
      buttonText: "Get Started",
      buttonUrl: BASE_URL,
      footerNote: "",
    }),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const returnTo = safeReturnTo(searchParams.get("return_to"));
  // TEMP DIAG (no secrets): shows whether return_to survived the email round-trip.
  console.log(
    `[DIAG callback] keys=${Array.from(searchParams.keys()).join(",")} ` +
    `return_to=${searchParams.get("return_to") ?? "MISSING"} safe=${returnTo ?? "null"} hasCode=${!!code}`
  );

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: sessionCookieOptions(request.nextUrl.hostname),
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

      // Send welcome email on first email confirmation (confirmed within last 10 min)
      if (user?.email && user.email_confirmed_at) {
        const confirmedAt = new Date(user.email_confirmed_at).getTime();
        if (Date.now() - confirmedAt < 10 * 60 * 1000) {
          const firstName = (user.user_metadata?.name as string | undefined)?.split(" ")[0] ?? "there";
          sendOwnerWelcomeEmail(user.email, firstName).catch(() => {});
        }
      }

      // A new owner who came from the trainer app is sent back there.
      if (returnTo) return NextResponse.redirect(returnTo);

      return NextResponse.redirect(`${origin}${next !== "/" ? next : "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
