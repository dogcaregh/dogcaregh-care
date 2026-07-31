import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { resolveAudience, type AudienceKey } from "@/lib/campaign-audiences";
import { templateByKey } from "@/lib/campaign-templates";
import { buildEmail, firstNameOf, type CampaignRecipient } from "@/lib/campaign-email";

export const dynamic = "force-dynamic";

const maskEmail = (e: string) => {
  const [name, domain] = e.split("@");
  if (!domain) return e;
  const head = name.length <= 2 ? name[0] || "" : name.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, name.length - head.length))}@${domain}`;
};

// Returns recipient count + the email rendered against a REAL recipient.
export async function POST(req: NextRequest) {
  const { ok, db } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateKey, audienceKey, userIds } = await req.json();
  const template = templateByKey(templateKey);
  if (!template) return NextResponse.json({ error: "Unknown email" }, { status: 400 });

  let recipients: CampaignRecipient[] = [];
  try {
    recipients = await resolveAudience(db, audienceKey as AudienceKey, userIds);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to resolve audience" }, { status: 500 });
  }

  const sample: CampaignRecipient = recipients[0] ?? { id: "preview", email: "preview@dogcaregh.com", name: "Ama" };
  const built = buildEmail(template, sample);

  return NextResponse.json({
    count: recipients.length,
    subject: template.subject,
    sample: { firstName: firstNameOf(sample.name), email: recipients[0] ? maskEmail(sample.email) : null },
    html: built.html,
  });
}
