import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

// GET            -> recent campaigns (the log)
// GET ?id=<uuid> -> the recipients of one campaign (who it went to)
export async function GET(req: NextRequest) {
  const { ok, db } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const { data, error } = await db
      .from("email_campaign_recipients")
      .select("email, first_name, status, error, created_at")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ recipients: data ?? [] });
  }

  const { data, error } = await db
    .from("email_campaigns")
    .select("id, template_key, subject, audience_label, recipient_count, sent_count, failed_count, is_test, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [] });
}
