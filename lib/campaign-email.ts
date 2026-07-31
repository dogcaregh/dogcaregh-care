// Marketing/campaign email — DELIBERATELY ISOLATED from transactional email.
//
// This module has its own Resend client, its own branded shell, its own
// "from" address and an unsubscribe footer. It is never imported by booking
// or payment code (lib/dogCareEmail.js), so a fault here — a render bug, a
// Resend outage, a bad batch — cannot affect booking confirmations or
// payment receipts. Server-only (uses node:crypto).

import { createHmac, timingSafeEqual } from "crypto";
import { Resend } from "resend";
import type { CampaignTemplate } from "./campaign-templates";

export const CAMPAIGN_FROM = "DogCareGH <hello@dogcaregh.com>"; // separate from transactional noreply@
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://dogcaregh.com";
const SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dogcaregh-unsub";

const BRAND = { pine: "#103d36", teal: "#15a08f", cream: "#fbf7ef", ink: "#103d36", body: "#4a5957", muted: "#8a9694" };

// ---- personalisation ----
export function firstNameOf(fullName: string | null | undefined): string {
  const n = (fullName || "").trim().split(/\s+/)[0];
  return n && /[a-z]/i.test(n) ? n : "there";
}
export const personalize = (text: string, firstName: string): string =>
  text.replace(/\{\{\s*first_name\s*\}\}/g, firstName);

// ---- unsubscribe token (HMAC; no DB token needed) ----
export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", SECRET).update(userId).digest("hex").slice(0, 32);
}
export function verifyUnsubscribe(userId: string, token: string): boolean {
  if (!userId || !token) return false;
  const expected = unsubscribeToken(userId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const unsubscribeUrl = (userId: string): string =>
  `${BASE}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;

// ---- branded HTML (independent of the transactional shell) ----
export function renderCampaignEmail(opts: {
  preheader: string; heading: string; bodyHtml: string;
  ctaLabel?: string | null; ctaUrl?: string | null; unsubUrl: string;
}): string {
  const { preheader, heading, bodyHtml, ctaLabel, ctaUrl, unsubUrl } = opts;
  const button = ctaLabel && ctaUrl ? `
        <tr><td align="center" style="padding:26px 44px 6px 44px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" bgcolor="${BRAND.teal}" style="border-radius:8px;">
              <a href="${ctaUrl}" style="display:inline-block; padding:14px 34px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; font-family:'Poppins','Trebuchet MS',Verdana,sans-serif;">${ctaLabel}</a>
            </td></tr></table>
        </td></tr>` : "";

  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light">
  <title>DogCareGH</title>
  <style>
    body { margin:0; padding:0; width:100%; background-color:${BRAND.cream}; -webkit-text-size-adjust:100%; font-family:'Poppins','Trebuchet MS',Verdana,sans-serif; }
    table { border-collapse:collapse; } a { text-decoration:none; }
    @media only screen and (max-width:620px){ .card{width:100%!important;border-radius:0!important;} .pad{padding-left:24px!important;padding-right:24px!important;} }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.cream};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:${BRAND.cream}; font-size:1px; line-height:1px;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:14px; box-shadow:0 1px 4px rgba(16,61,54,0.10); overflow:hidden;">
        <tr><td align="center" style="background-color:${BRAND.pine}; padding:26px 30px;">
          <img src="https://dogcaregh.com/weblogo.png" width="200" alt="DogCareGH" style="display:block; width:200px; max-width:60%; height:auto; border:0;">
        </td></tr>
        <tr><td class="pad" style="padding:34px 44px 4px 44px;">
          <h1 style="margin:0 0 10px 0; font-size:23px; color:${BRAND.ink}; font-weight:700;">${heading}</h1>
          <p style="margin:0; font-size:15px; line-height:1.65; color:${BRAND.body};">${bodyHtml}</p>
        </td></tr>
        ${button}
        <tr><td style="padding-bottom:14px;"></td></tr>
      </table>
      <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px;">
        <tr><td align="center" style="padding:22px 30px;">
          <p style="margin:0 0 8px 0; font-size:13px; color:${BRAND.muted};"><a href="${BASE}" style="color:${BRAND.teal}; font-weight:600;">dogcaregh.com</a> &nbsp;&middot;&nbsp; Accra, Ghana</p>
          <p style="margin:0; font-size:12px; color:#b3bcba; line-height:1.6;">You're receiving this because you have a DogCareGH account.<br>
            <a href="${unsubUrl}" style="color:${BRAND.muted}; text-decoration:underline;">Unsubscribe from updates like this</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---- build one personalised email object for a recipient ----
export type CampaignRecipient = { id: string; email: string; name: string | null };

export function buildEmail(t: CampaignTemplate, r: CampaignRecipient) {
  const first = firstNameOf(r.name);
  const unsub = unsubscribeUrl(r.id);
  const bodyHtml = personalize(t.body, first).replace(/\n/g, "<br />");
  const html = renderCampaignEmail({
    preheader: t.preheader,
    heading: t.heading,
    bodyHtml,
    ctaLabel: t.cta?.label ?? null,
    ctaUrl: t.cta ? `${BASE}${t.cta.path}` : null,
    unsubUrl: unsub,
  });
  return {
    from: CAMPAIGN_FROM,
    to: r.email,
    subject: t.subject,
    html,
    headers: {
      "List-Unsubscribe": `<${unsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    _firstName: first,
  };
}

// ---- isolated batch send. Chunked; never throws to the caller. ----
export type SendOutcome = { id: string; email: string; firstName: string; status: "sent" | "failed"; error: string | null };

export async function sendCampaign(t: CampaignTemplate, recipients: CampaignRecipient[]): Promise<SendOutcome[]> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const outcomes: SendOutcome[] = [];
  const CHUNK = 100;
  for (let i = 0; i < recipients.length; i += CHUNK) {
    const slice = recipients.slice(i, i + CHUNK);
    const emails = slice.map((r) => buildEmail(t, r));
    try {
      const { error } = await resend.batch.send(
        emails.map(({ _firstName, ...e }) => { void _firstName; return e; })
      );
      const err = error ? (error.message || "send failed") : null;
      slice.forEach((r, j) => outcomes.push({
        id: r.id, email: r.email, firstName: emails[j]._firstName,
        status: err ? "failed" : "sent", error: err,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "send failed";
      slice.forEach((r, j) => outcomes.push({ id: r.id, email: r.email, firstName: emails[j]._firstName, status: "failed", error: msg }));
    }
  }
  return outcomes;
}
