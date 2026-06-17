// ============================================================================
//  DogCareGH — branded email layout for Resend
//  ----------------------------------------------------------------------------
//  ONE function builds the branded shell (pine header + logo + footer).
//  You only ever pass in the bits that change per email.
//
//  Usage:
//    import { renderDogCareEmail } from "./dogCareEmail.js";
//    const html = renderDogCareEmail({ ...content... });
//    await resend.emails.send({ from, to, subject, html });
// ============================================================================

const BRAND = {
  logoUrl: "https://dogcaregh.com/weblogo.png", // <-- your hosted logo
  pine:    "#103d36",
  teal:    "#15a08f",
  cream:   "#fbf7ef",
  ink:     "#103d36",
  body:    "#4a5957",
  muted:   "#8a9694",
  site:    "https://dogcaregh.com",
};

/**
 * Build a full branded DogCareGH email.
 *
 * @param {object}  opts
 * @param {string}  opts.preheader   Hidden inbox-preview line (1 short sentence)
 * @param {string}  opts.heading     Big heading, e.g. "Your booking is confirmed 🐾"
 * @param {string}  opts.intro       Opening paragraph, e.g. "Hi Ama, great news — ..."
 * @param {Array<{label:string,value:string}>} [opts.rows]   Summary-box rows (optional)
 * @param {string}  [opts.total]     Highlighted total line, e.g. "GHS 120.00" (optional)
 * @param {string}  [opts.buttonText]  Button label (optional)
 * @param {string}  [opts.buttonUrl]   Button link (optional)
 * @param {string}  [opts.footerNote]  Small note under the button (optional)
 * @returns {string} full HTML email
 */
export function renderDogCareEmail({
  preheader = "",
  heading = "",
  intro = "",
  rows = [],
  total = "",
  buttonText = "",
  buttonUrl = "",
  footerNote = "Need to make a change? Just reply to this email or manage everything from your bookings page.",
} = {}) {

  const rowsHtml = rows.map(r => `
                  <tr>
                    <td style="padding:5px 0;">${r.label}</td>
                    <td align="right" style="padding:5px 0; color:${BRAND.ink}; font-weight:600;">${r.value}</td>
                  </tr>`).join("");

  const totalHtml = total ? `
                  <tr><td colspan="2" style="border-top:1px solid #eee3d2; padding-top:10px;"></td></tr>
                  <tr>
                    <td style="padding:5px 0; font-weight:600; color:${BRAND.ink};">Total</td>
                    <td align="right" style="padding:5px 0; color:${BRAND.ink}; font-weight:700; font-size:16px;">${total}</td>
                  </tr>` : "";

  const summaryBox = (rows.length || total) ? `
        <tr>
          <td class="pad" style="padding:20px 44px 8px 44px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream}; border:1px solid #eee3d2; border-radius:10px;">
              <tr><td style="padding:18px 22px; font-family:'Poppins','Trebuchet MS',Verdana,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:${BRAND.body};">${rowsHtml}${totalHtml}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>` : "";

  const buttonHtml = (buttonText && buttonUrl) ? `
        <tr>
          <td class="pad" align="center" style="padding:24px 44px 8px 44px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td align="center" bgcolor="${BRAND.teal}" style="border-radius:8px;">
                <a href="${buttonUrl}" class="wm" style="display:inline-block; padding:14px 34px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">${buttonText}</a>
              </td>
            </tr></table>
          </td>
        </tr>` : "";

  const footerNoteHtml = footerNote ? `
        <tr>
          <td class="pad" style="padding:16px 44px 34px 44px; font-family:'Poppins','Trebuchet MS',Verdana,sans-serif;">
            <p style="margin:0; font-size:13px; line-height:1.6; color:${BRAND.muted};">${footerNote}</p>
          </td>
        </tr>` : `<tr><td style="padding-bottom:18px;"></td></tr>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>DogCareGH</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
  <style>
    body { margin:0; padding:0; width:100%; background-color:${BRAND.cream}; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    a { text-decoration:none; }
    .wm { font-family:'Poppins','Trebuchet MS',Verdana,sans-serif; }
    @media only screen and (max-width:620px) {
      .card { width:100% !important; border-radius:0 !important; }
      .pad { padding-left:24px !important; padding-right:24px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.cream};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:${BRAND.cream}; font-size:1px; line-height:1px;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};">
    <tr><td align="center" style="padding:32px 16px;">

      <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:14px; box-shadow:0 1px 4px rgba(16,61,54,0.10); overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td align="center" style="background-color:${BRAND.pine}; padding:26px 30px;">
            <img src="${BRAND.logoUrl}" width="200" alt="DogCareGH" style="display:block; width:200px; max-width:60%; height:auto; border:0;">
          </td>
        </tr>

        <!-- CONTENT -->
        <tr>
          <td class="pad" style="padding:34px 44px 8px 44px; font-family:'Poppins','Trebuchet MS',Verdana,sans-serif;">
            <h1 style="margin:0 0 6px 0; font-size:23px; color:${BRAND.ink}; font-weight:700;">${heading}</h1>
            <p style="margin:0; font-size:15px; line-height:1.6; color:${BRAND.body};">${intro}</p>
          </td>
        </tr>
        ${summaryBox}
        ${buttonHtml}
        ${footerNoteHtml}

      </table>

      <!-- FOOTER -->
      <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px;">
        <tr><td align="center" style="padding:24px 30px; font-family:'Poppins','Trebuchet MS',Verdana,sans-serif;">
          <p style="margin:0 0 8px 0; font-size:13px; color:${BRAND.muted};"><a href="${BRAND.site}" style="color:${BRAND.teal}; font-weight:600;">dogcaregh.com</a> &nbsp;&middot;&nbsp; Accra, Ghana</p>
          <p style="margin:0; font-size:12px; color:#b3bcba; line-height:1.6;">You're receiving this because you have a DogCareGH account.<br>&copy; 2026 DogCareGH Limited. All rights reserved.</p>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

// ============================================================================
//  EXAMPLE — how a notification uses it (booking confirmation)
// ============================================================================
//
//  import { Resend } from "resend";
//  import { renderDogCareEmail } from "./dogCareEmail.js";
//  const resend = new Resend(process.env.RESEND_API_KEY);
//
//  const html = renderDogCareEmail({
//    preheader: "Good news — your booking is confirmed.",
//    heading:   "Your booking is confirmed 🐾",
//    intro:     "Hi Ama, great news — your caregiver has accepted. Here are the details:",
//    rows: [
//      { label: "Service",      value: "Dog Walking" },
//      { label: "Caregiver",    value: "Kwame A." },
//      { label: "Date & time",  value: "Sat, 21 Jun · 8:00 AM" },
//      { label: "Your dog",     value: "Bruno" },
//    ],
//    total:      "GHS 120.00",
//    buttonText: "View your booking",
//    buttonUrl:  "https://dogcaregh.com/bookings",
//  });
//
//  await resend.emails.send({
//    from: "DogCareGH <hello@dogcaregh.com>",
//    to:   owner.email,
//    subject: "Your booking is confirmed",
//    html,
//  });
// ============================================================================
