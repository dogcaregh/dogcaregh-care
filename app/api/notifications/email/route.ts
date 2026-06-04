import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const FROM = "DogCareGH <onboarding@resend.dev>";
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";

function getClients() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return { resend, admin };
}

const SERVICE_LABELS: Record<string, string> = {
  dog_walking:    "Dog Walking",
  pet_sitting:    "Dog Sitting",
  doggy_daycare:  "Dog Daycare",
  dog_boarding:   "Dog Overnight",
  mobile_grooming:"Dog Grooming",
};

type NotificationType =
  | "booking_confirmed"
  | "booking_declined"
  | "booking_cancelled"
  | "payment_received"
  | "payment_confirmed"
  | "service_started"
  | "awaiting_confirmation"
  | "payout_triggered"
  | "cashout_paid"
  | "cashout_rejected"
  | "booking_cancelled"
  | "new_message";

interface EmailContent {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

function buildContent(
  type: NotificationType,
  message: string,
  bookingId: string | null,
  ownerName: string,
  providerName: string,
  service: string,
  payoutAmount: string,
  grossAmount: string,
): EmailContent | null {
  const bookingUrl = bookingId ? `${BASE_URL}/booking/${bookingId}` : BASE_URL;

  switch (type) {
    case "booking_confirmed":
      return {
        subject: "Your booking has been accepted — payment required",
        heading: "Booking Accepted!",
        body: `Great news! <strong>${providerName}</strong> has accepted your ${service} booking. Please complete your payment to secure the service.`,
        ctaLabel: "Pay Now",
        ctaUrl: bookingUrl,
      };

    case "booking_declined":
      return {
        subject: "Your booking request was declined",
        heading: "Booking Request Declined",
        body: `Unfortunately, <strong>${providerName}</strong> is unable to take your ${service} booking. You can search for another provider on DogCareGH.`,
        ctaLabel: "Find a Provider",
        ctaUrl: `${BASE_URL}/search`,
      };

    case "booking_cancelled":
      return {
        subject: "A booking has been cancelled",
        heading: "Booking Cancelled",
        body: `<strong>${ownerName}</strong> has cancelled their ${service} booking.`,
        ctaLabel: "View Booking",
        ctaUrl: bookingUrl,
      };

    case "payment_received":
      return {
        subject: `Payment received — GHS ${grossAmount}`,
        heading: "Payment Received",
        body: `You've received a payment of <strong>GHS ${grossAmount}</strong> from <strong>${ownerName}</strong> for the ${service} booking. The service is ready to begin.`,
        ctaLabel: "View Booking",
        ctaUrl: bookingUrl,
      };

    case "payment_confirmed":
      return {
        subject: "Payment confirmed — you're all set!",
        heading: "Payment Confirmed",
        body: `Your payment has been confirmed for your ${service} booking with <strong>${providerName}</strong>. Your pet is in good hands!`,
        ctaLabel: "View Booking",
        ctaUrl: bookingUrl,
      };

    case "service_started":
      return {
        subject: `Your ${service} service has started`,
        heading: "Service Started",
        body: `<strong>${providerName}</strong> has started your ${service} service. We hope your pet has a great time!`,
        ctaLabel: "View Booking",
        ctaUrl: bookingUrl,
      };

    case "awaiting_confirmation":
      return {
        subject: "Service complete — please confirm",
        heading: "Please Confirm Completion",
        body: `<strong>${providerName}</strong> has marked your ${service} as complete. Please confirm to release their payment.`,
        ctaLabel: "Confirm & Release Payment",
        ctaUrl: bookingUrl,
      };

    case "payout_triggered":
      return {
        subject: `Your payout of GHS ${payoutAmount} has been triggered`,
        heading: "Payout Triggered",
        body: `Your payout of <strong>GHS ${payoutAmount}</strong> for the ${service} booking with <strong>${ownerName}</strong> has been triggered. Funds will arrive shortly.`,
        ctaLabel: "View Booking",
        ctaUrl: bookingUrl,
      };

    case "cashout_paid":
      return {
        subject: "Your withdrawal has been sent",
        heading: "Withdrawal Sent!",
        body: message,
        ctaLabel: "View Earnings",
        ctaUrl: `${BASE_URL}/dashboard/provider`,
      };

    case "cashout_rejected":
      return {
        subject: "Your withdrawal request could not be processed",
        heading: "Withdrawal Not Approved",
        body: message,
        ctaLabel: "View Earnings",
        ctaUrl: `${BASE_URL}/dashboard/provider`,
      };

    case "booking_cancelled":
      return {
        subject: "Booking cancellation update",
        heading: "Booking Cancelled",
        body: message,
        ctaLabel: "View Dashboard",
        ctaUrl: `${BASE_URL}/dashboard/owner`,
      };

    case "new_message":
      return {
        subject: message,
        heading: "New Message",
        body: `You have a new message about your booking.`,
        ctaLabel: "View Message",
        ctaUrl: `${bookingUrl}?tab=messages`,
      };

    default:
      return null;
  }
}

function renderHtml(content: EmailContent): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${content.subject}</title>
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
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0a2e30;">${content.heading}</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.6;">${content.body}</p>
            <a href="${content.ctaUrl}"
               style="display:inline-block;background:#00b096;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;">
              ${content.ctaLabel}
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
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.NOTIFICATIONS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resend, admin } = getClients();

  const payload = await req.json();
  if (payload.type !== "INSERT" || !payload.record) {
    return NextResponse.json({ ok: true });
  }

  const { user_id, booking_id, type, message } = payload.record as {
    user_id: string;
    booking_id: string | null;
    type: NotificationType;
    message: string;
  };

  const { data: { user } } = await admin.auth.admin.getUserById(user_id);
  if (!user?.email) return NextResponse.json({ ok: true });

  let ownerName = "the owner";
  let providerName = "the provider";
  let service = "service";
  let providerPayout = "0.00";
  let grossAmount = "0.00";

  if (booking_id) {
    const { data: booking } = await admin
      .from("bookings")
      .select(`
        service_type, gross_amount, provider_payout,
        owner:users!bookings_owner_id_fkey(name),
        provider:providers!bookings_provider_id_fkey(
          user:users!providers_user_id_fkey(name)
        )
      `)
      .eq("id", booking_id)
      .single();

    if (booking) {
      service = SERVICE_LABELS[booking.service_type] ?? booking.service_type;
      providerPayout = Number(booking.provider_payout).toFixed(2);
      grossAmount = Number(booking.gross_amount).toFixed(2);
      ownerName = ((booking.owner as unknown) as { name: string } | null)?.name ?? ownerName;
      providerName = ((booking.provider as unknown) as { user: { name: string } | null } | null)?.user?.name ?? providerName;
    }
  }

  const content = buildContent(
    type, message, booking_id,
    ownerName, providerName, service,
    providerPayout, grossAmount,
  );
  if (!content) return NextResponse.json({ ok: true });

  try {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: content.subject,
      html: renderHtml(content),
    });
  } catch (err) {
    console.error("[email-notification] send failed:", err);
  }

  return NextResponse.json({ ok: true });
}
