import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { lookupCoords } from "@/lib/geocode";

export const dynamic = "force-dynamic";

const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

async function requireAdmin(): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await db().from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") ?? "pending";

  let query = db()
    .from("providers")
    .select(`
      id, verification_status, provider_level, verification_docs,
      verification_note, verified_at, created_at,
      users!user_id(name, email, phone)
    `)
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("verification_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ providers: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, action, level, note } = await req.json();
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const service = db();

  // Fetch neighbourhood so we can geocode if coordinates are missing
  const { data: providerGeo } = await service
    .from("providers")
    .select("neighbourhood, lat, lng")
    .eq("id", id)
    .single();

  const update: Record<string, unknown> = action === "approve"
    ? {
        verification_status: "approved",
        provider_level:      level ?? 1,
        verified:            true,
        active:              true,
        verified_at:         new Date().toISOString(),
        verification_note:   note?.trim() || null,
      }
    : {
        verification_status: "rejected",
        verified:            false,
        verification_note:   note?.trim() || null,
      };

  // Set coordinates on approval if they were never geocoded at registration
  if (action === "approve" && providerGeo && providerGeo.lat == null && providerGeo.neighbourhood) {
    const coords = lookupCoords(providerGeo.neighbourhood);
    if (coords) {
      update.lat = coords.lat;
      update.lng = coords.lng;
    }
  }

  const { error: updateErr } = await service.from("providers").update(update).eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Get provider's user_id and contact info for notification
  const { data: prov } = await service
    .from("providers")
    .select("user_id, users!user_id(name, email)")
    .eq("id", id)
    .single();

  if (prov) {
    const provUsers  = Array.isArray(prov.users) ? prov.users[0] : prov.users;
    const provUser   = provUsers as { name: string; email: string } | null;
    const provUserId = prov.user_id as string;

    const message = action === "approve"
      ? `Congratulations! Your DogCareGH verification has been approved. You are now a Level ${level ?? 1} Carer and can start accepting bookings.`
      : `Your DogCareGH verification application was not approved.${note?.trim() ? ` Reason: ${note.trim()}` : ""} You may reapply after addressing the issues.`;

    await service.from("notifications").insert({
      user_id:    provUserId,
      booking_id: null,
      type:       action === "approve" ? "verification_approved" : "verification_rejected",
      message,
    });

    if (provUser?.email) {
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";
      fetch(`${base}/api/notifications/email`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-webhook-secret": process.env.NOTIFICATIONS_WEBHOOK_SECRET ?? "" },
        body: JSON.stringify({
          to:           provUser.email,
          type:         action === "approve" ? "verification_approved" : "verification_rejected",
          message,
          providerName: provUser.name,
        }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
