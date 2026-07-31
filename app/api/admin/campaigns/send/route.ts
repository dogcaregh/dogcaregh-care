import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { resolveAudience, AUDIENCE_LABELS, type AudienceKey } from "@/lib/campaign-audiences";
import { templateByKey } from "@/lib/campaign-templates";
import { sendCampaign, type CampaignRecipient } from "@/lib/campaign-email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { ok, userId, email, db } = await requireAdmin();
  if (!ok || !userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateKey, audienceKey, userIds, test } = await req.json();
  const template = templateByKey(templateKey);
  if (!template) return NextResponse.json({ error: "Unknown email" }, { status: 400 });

  // ---- Test to self: send only to the admin's own address, no audience touched.
  if (test) {
    if (!email) return NextResponse.json({ error: "Your account has no email" }, { status: 400 });
    const { data: me } = await db.from("users").select("name").eq("id", userId).single();
    const self: CampaignRecipient = { id: userId, email, name: (me as { name: string | null } | null)?.name ?? null };
    const [outcome] = await sendCampaign(template, [self]);
    if (outcome?.status !== "sent") return NextResponse.json({ error: outcome?.error || "Test failed to send" }, { status: 502 });
    return NextResponse.json({ ok: true, test: true, sentTo: email });
  }

  // ---- Real campaign.
  let recipients: CampaignRecipient[];
  try {
    recipients = await resolveAudience(db, audienceKey as AudienceKey, userIds);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to resolve audience" }, { status: 500 });
  }
  if (recipients.length === 0) return NextResponse.json({ error: "No eligible recipients (empty, or all unsubscribed)" }, { status: 400 });

  const label = AUDIENCE_LABELS[(audienceKey as AudienceKey)] ?? audienceKey;

  // Log the campaign up front so a mid-send crash still leaves a record.
  const { data: campaign, error: cErr } = await db.from("email_campaigns").insert({
    template_key: template.key, subject: template.subject,
    audience_key: audienceKey, audience_label: label,
    recipient_count: recipients.length, sent_by: userId,
  }).select("id").single();
  if (cErr || !campaign) return NextResponse.json({ error: cErr?.message || "Could not create campaign" }, { status: 500 });
  const campaignId = (campaign as { id: string }).id;

  const outcomes = await sendCampaign(template, recipients);
  const sent = outcomes.filter((o) => o.status === "sent").length;
  const failed = outcomes.length - sent;

  await db.from("email_campaign_recipients").insert(
    outcomes.map((o) => ({ campaign_id: campaignId, user_id: o.id, email: o.email, first_name: o.firstName, status: o.status, error: o.error }))
  );
  await db.from("email_campaigns").update({ sent_count: sent, failed_count: failed }).eq("id", campaignId);

  return NextResponse.json({ ok: true, campaignId, recipientCount: recipients.length, sent, failed });
}
