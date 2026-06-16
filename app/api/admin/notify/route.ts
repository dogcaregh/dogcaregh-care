import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";
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

function renderHtml(subject: string, message: string): string {
  const escaped = message.trim().replace(/\n/g, "<br />");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0a2e30;padding:28px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
              Dog<span style="color:#00b096;">Care</span>GH
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0a2e30;">Message from DogCareGH</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.6;">${escaped}</p>
            <a href="${BASE_URL}"
               style="display:inline-block;background:#00b096;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;">
              Go to DogCareGH
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
              You're receiving this because you have a DogCareGH account.<br />
              <a href="${BASE_URL}" style="color:#00b096;text-decoration:none;">Visit DogCareGH</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailErr } = await resend.emails.send({
    from:    FROM,
    to:      user.email,
    subject: subject.trim(),
    html:    renderHtml(subject.trim(), message.trim()),
  });

  if (emailErr) {
    console.error("[admin/notify] resend error:", emailErr);
    return NextResponse.json({ error: "Notification saved but email failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
