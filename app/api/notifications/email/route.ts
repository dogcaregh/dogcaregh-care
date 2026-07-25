import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { renderDogCareEmail } from "@/lib/dogCareEmail";

export const dynamic = "force-dynamic";

const FROM = "DogCareGH <noreply@dogcaregh.com>";
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dogcaregh.com";

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
  add_on:         "Add-on",
};

type NotificationType =
  | "booking_request"
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
  | "verification_approved"
  | "verification_rejected"
  | "new_message"
  | "reminder";

function buildContent(
  type: NotificationType,
  message: string,
  bookingId: string | null,
  ownerName: string,
  providerName: string,
  service: string,
  payoutAmount: string,
  grossAmount: string,
): { subject: string; html: string } | null {
  const bookingUrl = bookingId ? `${BASE_URL}/booking/${bookingId}` : BASE_URL;

  switch (type) {
    case "booking_request":
      return {
        subject: `New booking request — ${service}`,
        html: renderDogCareEmail({
          preheader: `New ${service} booking request from ${ownerName}`,
          heading: "New Booking Request",
          intro: `<strong>${ownerName}</strong> has sent you a ${service} booking request. Review the details and accept or decline.`,
          buttonText: "View Request",
          buttonUrl: bookingUrl,
        }),
      };

    case "booking_confirmed":
      return {
        subject: "Your booking has been accepted — payment required",
        html: renderDogCareEmail({
          preheader: "Your booking was accepted — complete payment to confirm",
          heading: "Booking Accepted!",
          intro: `Great news! <strong>${providerName}</strong> has accepted your ${service} booking. Please complete your payment to secure the service.`,
          buttonText: "Pay Now",
          buttonUrl: bookingUrl,
        }),
      };

    case "booking_declined":
      return {
        subject: "Your booking request was declined",
        html: renderDogCareEmail({
          preheader: "Your booking request was declined",
          heading: "Booking Request Declined",
          intro: `Unfortunately, <strong>${providerName}</strong> is unable to take your ${service} booking. You can search for another provider on DogCareGH.`,
          buttonText: "Find a Provider",
          buttonUrl: `${BASE_URL}/search`,
        }),
      };

    case "booking_cancelled":
      return {
        subject: "A booking has been cancelled",
        html: renderDogCareEmail({
          preheader: "A booking has been cancelled",
          heading: "Booking Cancelled",
          intro: `<strong>${ownerName}</strong> has cancelled their ${service} booking.`,
          buttonText: "View Booking",
          buttonUrl: bookingUrl,
        }),
      };

    case "payment_received":
      return {
        subject: `Payment received — GHS ${grossAmount}`,
        html: renderDogCareEmail({
          preheader: `Payment of GHS ${grossAmount} received from ${ownerName}`,
          heading: "Payment Received",
          intro: `You've received a payment of <strong>GHS ${grossAmount}</strong> from <strong>${ownerName}</strong> for the ${service} booking. The service is ready to begin.`,
          total: `GHS ${grossAmount}`,
          buttonText: "View Booking",
          buttonUrl: bookingUrl,
        }),
      };

    case "payment_confirmed":
      return {
        subject: "Payment confirmed — you're all set!",
        html: renderDogCareEmail({
          preheader: "Your payment has been confirmed",
          heading: "Payment Confirmed",
          intro: `Your payment has been confirmed for your ${service} booking with <strong>${providerName}</strong>. Your pet is in good hands!`,
          buttonText: "View Booking",
          buttonUrl: bookingUrl,
        }),
      };

    case "service_started":
      return {
        subject: `Your ${service} service has started`,
        html: renderDogCareEmail({
          preheader: `${providerName} has started your ${service} service`,
          heading: "Service Started",
          intro: `<strong>${providerName}</strong> has started your ${service} service. We hope your pet has a great time!`,
          buttonText: "View Booking",
          buttonUrl: bookingUrl,
        }),
      };

    case "awaiting_confirmation":
      return {
        subject: "Service complete — please confirm",
        html: renderDogCareEmail({
          preheader: "Service complete — your confirmation is needed",
          heading: "Please Confirm Completion",
          intro: `<strong>${providerName}</strong> has marked your ${service} as complete. Please confirm to release their payment.`,
          buttonText: "Confirm & Release Payment",
          buttonUrl: bookingUrl,
        }),
      };

    case "payout_triggered":
      return {
        subject: `Your payout of GHS ${payoutAmount} has been triggered`,
        html: renderDogCareEmail({
          preheader: `Your payout of GHS ${payoutAmount} has been triggered`,
          heading: "Payout Triggered",
          intro: `Your payout of <strong>GHS ${payoutAmount}</strong> for the ${service} booking with <strong>${ownerName}</strong> has been triggered. Funds will arrive shortly.`,
          total: `GHS ${payoutAmount}`,
          buttonText: "View Booking",
          buttonUrl: bookingUrl,
        }),
      };

    case "cashout_paid":
      return {
        subject: "Your withdrawal has been sent",
        html: renderDogCareEmail({
          preheader: "Your withdrawal has been sent",
          heading: "Withdrawal Sent!",
          intro: message,
          buttonText: "View Earnings",
          buttonUrl: `${BASE_URL}/dashboard/provider`,
        }),
      };

    case "cashout_rejected":
      return {
        subject: "Your withdrawal request could not be processed",
        html: renderDogCareEmail({
          preheader: "Your withdrawal request could not be processed",
          heading: "Withdrawal Not Approved",
          intro: message,
          buttonText: "View Earnings",
          buttonUrl: `${BASE_URL}/dashboard/provider`,
        }),
      };

    case "booking_cancelled":
      return {
        subject: "Booking cancellation update",
        html: renderDogCareEmail({
          preheader: "Booking cancellation update",
          heading: "Booking Cancelled",
          intro: message,
          buttonText: "View Dashboard",
          buttonUrl: `${BASE_URL}/dashboard/owner`,
        }),
      };

    case "verification_approved":
      return {
        subject: "You're verified on DogCareGH!",
        html: renderDogCareEmail({
          preheader: "You're verified on DogCareGH!",
          heading: "Verification Approved 🎉",
          intro: message,
          buttonText: "Go to Dashboard",
          buttonUrl: `${BASE_URL}/dashboard/provider`,
        }),
      };

    case "verification_rejected":
      return {
        subject: "Update on your DogCareGH application",
        html: renderDogCareEmail({
          preheader: "Update on your DogCareGH application",
          heading: "Application Update",
          intro: message,
          buttonText: "Reapply",
          buttonUrl: `${BASE_URL}/dashboard/provider/verify`,
        }),
      };

    case "new_message":
      return {
        subject: message,
        html: renderDogCareEmail({
          preheader: "You have a new message about your booking",
          heading: "New Message",
          intro: "You have a new message about your booking.",
          buttonText: "View Message",
          buttonUrl: `${bookingUrl}?tab=messages`,
        }),
      };

    case "reminder":
      return {
        subject: "Reminder: action needed on your booking",
        html: renderDogCareEmail({
          preheader: message,
          heading: "A quick reminder",
          intro: message,
          buttonText: "View Booking",
          buttonUrl: bookingUrl,
        }),
      };

    default:
      return null;
  }
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

  const { data: { user }, error: authErr } = await admin.auth.admin.getUserById(user_id);
  if (!user?.email) {
    console.warn("[email-notification] no email for user", user_id, authErr?.message);
    return NextResponse.json({ ok: true });
  }

  let ownerName = "the owner";
  let providerName = "the provider";
  let service = "service";
  let providerPayout = "0.00";
  let grossAmount = "0.00";

  if (booking_id) {
    const { data: booking, error: bErr } = await admin
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

    if (bErr) console.warn("[email-notification] booking lookup failed:", bErr.message);

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
  if (!content) {
    console.warn("[email-notification] no content for type:", type);
    return NextResponse.json({ ok: true });
  }

  console.log("[email-notification] sending", type, "to", user.email);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: content.subject,
      html: content.html,
    });
    if (error) console.error("[email-notification] resend error:", error);
    else console.log("[email-notification] sent id:", data?.id);
  } catch (err) {
    console.error("[email-notification] send failed:", err);
  }

  return NextResponse.json({ ok: true });
}
