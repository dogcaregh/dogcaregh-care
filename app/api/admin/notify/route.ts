import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import { renderDogCareEmail } from "@/lib/dogCareEmail";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dogcaregh.com";
const FROM = "DogCareGH <noreply@dogcaregh.com>";

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


export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, subject, message } = await req.json();
  if (!userId || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "userId, subject, and message are required" }, { status: 400 });
  }

  const admin = db();

  const { data: { user } } = await admin.auth.admin.getUserById(userId);
  if (!user?.email) {
    return NextResponse.json({ error: "User not found or has no email" }, { status: 404 });
  }

  await admin.from("notifications").insert({
    user_id:    userId,
    booking_id: null,
    type:       "admin_message",
    message:    message.trim(),
  });

  const escaped = message.trim().replace(/\n/g, "<br />");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailErr } = await resend.emails.send({
    from:    FROM,
    to:      user.email,
    subject: subject.trim(),
    html:    renderDogCareEmail({
      preheader: subject.trim(),
      heading:   "Message from DogCareGH",
      intro:     escaped,
      buttonText: "Go to DogCareGH",
      buttonUrl:  BASE_URL,
      footerNote: "",
    }),
  });

  if (emailErr) {
    console.error("[admin/notify] resend error:", emailErr);
    return NextResponse.json({ error: "Notification saved but email failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
