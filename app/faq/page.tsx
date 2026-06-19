import type { Metadata } from "next";
import Link from "next/link";
import { SERVICE_META } from "@/lib/service-meta";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about DogCareGH — how bookings work, how carers are verified, payments, cancellations, and more.",
};

const CATEGORIES = [
  {
    emoji: "🐾",
    title: "For Dog Owners",
    items: [
      {
        q: "How does DogCareGH work?",
        a: "DogCareGH connects dog owners with trusted, verified carers across Ghana. You search for a carer by service type and neighbourhood, view their profile and reviews, then send a booking request. Once the carer accepts, you pay securely through the platform. After the service is done and you confirm it went well, the carer is paid. Simple.",
      },
      {
        q: "What services are available?",
        a: "We offer five services: Dog Walking (a professional walker takes your dog out), Dog Sitting (a sitter comes to your home to care for your dog), Dog Daycare (your dog spends the day at the carer's home), Dog Overnight (your dog stays with a trusted carer for a night, a week, or longer), and Dog Grooming (at the groomer's place or a mobile groomer comes to you). You can filter by service when searching.",
      },
      {
        q: "Do I need to create an account to book?",
        a: "Yes. You need a free dog owner account to send booking requests, manage your dog's profile, and pay. Registration takes about two minutes — just your name, email, and neighbourhood.",
      },
      {
        q: "How do I add my dog's details?",
        a: "After signing up, go to your dashboard and click 'Add Dog'. You can add your dog's name, breed, age, size, vaccination status, and any special needs or medical notes. Carers use this information to care for your dog properly. You can add multiple dogs.",
      },
      {
        q: "Are carers background-checked?",
        a: "Yes. Every carer on DogCareGH goes through an identity and reference verification process before they can accept bookings. This includes a Ghana Card check verified against the national database, a selfie match, proof of address, and two character references. Carers offering home services also submit photos and a video of the space. Some carers optionally hold a Police Clearance Certificate, shown as a badge on their profile.",
      },
      {
        q: "What if I am not happy with the service?",
        a: "Do not confirm service completion until you are satisfied. Once a carer marks a service as complete, you have the option to either confirm it (which releases payment to the carer) or raise a dispute. If you raise a dispute, our team reviews it and steps in fairly. Do not confirm completion if there is a genuine problem — that is what the dispute process is for.",
      },
      {
        q: "Can I cancel a booking?",
        a: "Yes. You can cancel a pending booking (before payment) at any time at no charge. For paid bookings, cancellation terms depend on the policy you accepted at checkout. If you need to cancel due to a genuine emergency, contact support and we will review it case by case.",
      },
      {
        q: "What areas does DogCareGH cover?",
        a: "We are currently focused on Accra and Greater Accra — including areas like East Legon, Labone, Cantonments, Spintex, Tema, Adenta, and many more. We are growing, so if your area is not listed yet, check back soon.",
      },
    ],
  },
  {
    emoji: "🏡",
    title: "For Carers",
    items: [
      {
        q: "How do I become a carer on DogCareGH?",
        a: "Register for a carer account, then go to your dashboard and click 'Apply for Verification'. You will be asked to submit your Ghana Card, a selfie, proof of address, two character references, and a passport photo. If you offer home-based services, you will also need photos and a short video of the space. Our team reviews applications and usually responds within a few business days.",
      },
      {
        q: "What documents do I need for verification?",
        a: "Required: your Ghana Card (verified against the national database), a selfie taken in the app, proof of address (utility bill, tenancy agreement, or a signed note from an assembly member or community elder), names and phone numbers of two character references, and a passport photo. For home services: photos and a video of the space where dogs would stay, and a rabies vaccination certificate for any dog of your own sharing the space. Optional: a Police Clearance Certificate to earn the Police-Cleared badge.",
      },
      {
        q: "Can I set my own prices?",
        a: "Yes. You set your own rates for each service by dog size — small, medium, and large. You can also set your availability by day of the week and adjust your hours. Owners see your rates before they book, so keeping them accurate and competitive helps you get more bookings.",
      },
      {
        q: "What services can I offer?",
        a: "You can offer any combination of the five services: Dog Sitting, Dog Daycare, Dog Overnight, Dog Grooming, and Dog Walking. You manage which services are active from your dashboard under 'My Services'.",
      },
      {
        q: "How do I receive bookings?",
        a: "When an owner requests a booking, you get a notification in your dashboard. From there you can accept or decline. If you accept, the owner is prompted to pay. Once paid, the booking is confirmed and you can start the service on the agreed date.",
      },
      {
        q: "What happens if I need to cancel on an owner?",
        a: "We ask that carers avoid cancelling confirmed, paid bookings wherever possible — owners are relying on you. If you must cancel, contact support as soon as possible so the owner can find alternative care. Repeated cancellations may affect your standing on the platform.",
      },
    ],
  },
  {
    emoji: "💳",
    title: "Payments & Earnings",
    items: [
      {
        q: "How do payments work?",
        a: "All payments are processed securely through Paystack — Ghana's leading payment provider. Owners can pay by Mobile Money, debit/credit card, or bank transfer. Your payment is held safely until you confirm the service is complete, at which point it is released to the carer.",
      },
      {
        q: "How much does DogCareGH charge?",
        a: "DogCareGH takes a 25% platform commission on every completed booking. The carer receives the remaining 75%. The total price the owner pays already includes the commission — there are no surprise fees on top.",
      },
      {
        q: "How and when do carers get paid?",
        a: "Once the owner confirms service completion, the payout is triggered and becomes available in your earnings balance. You can request a withdrawal at any time from the Earnings section of your dashboard. Withdrawals are sent to your registered Mobile Money account. We aim to process all withdrawal requests within 2 business days.",
      },
      {
        q: "Is my payment information safe?",
        a: "Yes. Payments are handled entirely by Paystack. DogCareGH never sees or stores your full card number or Mobile Money PIN. We only keep transaction records (amounts, dates, and status) for booking management and dispute resolution.",
      },
      {
        q: "What is the refund policy?",
        a: "Refunds depend on the cancellation policy you accepted when you paid. If a booking is cancelled before payment, no charge applies. For paid bookings, the policy shown at checkout applies. In genuine emergency cases, contact support and we will review. Refunds are returned to your original payment method via Paystack.",
      },
    ],
  },
  {
    emoji: "🛡️",
    title: "Safety & Trust",
    items: [
      {
        q: "How do I know a carer is trustworthy?",
        a: "Every carer is identity-verified using their Ghana Card checked against the national database, reference-checked by two people, and location-verified. Carers offering home services additionally submit a home inspection (photos and video). You can also read verified reviews from other owners on each carer's profile. Look for the verified badge and, where available, the Police-Cleared badge.",
      },
      {
        q: "What if something happens to my dog?",
        a: "Your dog's safety is the top priority. If there is an incident, contact the carer directly first, then reach out to our support team at support@dogcaregh.com or 054 866 7516 immediately. You can also raise a dispute through your dashboard. We take all safety concerns seriously and will investigate promptly.",
      },
      {
        q: "Can I message a carer before booking?",
        a: "Yes. Once a booking request is made, an in-app messaging thread opens between you and the carer. You can use this to ask questions, share special instructions about your dog, or coordinate logistics before and during the service.",
      },
      {
        q: "How do reviews work?",
        a: "After a booking is closed, owners are invited to leave a star rating and written review for their carer. Reviews are visible on the carer's public profile and help other owners make informed choices. We do not allow businesses to remove genuine reviews.",
      },
      {
        q: "How do I report a problem or concern?",
        a: "You can raise a dispute directly from your booking in the dashboard, or contact us at support@dogcaregh.com or 054 866 7516. For urgent safety concerns, please call us directly.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-10 w-auto" /></Link>
          <Link href="/" className="text-xs font-semibold text-white/70 transition hover:text-white">← Back to home</Link>
        </div>
      </nav>

      {/* Header */}
      <div className="px-6 py-12 md:px-12 md:py-16" style={{ backgroundColor: "#0a2e30" }}>
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Help Centre</p>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">Frequently Asked Questions</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            Everything you need to know about DogCareGH. Can&apos;t find your answer?{" "}
            <Link href="/contact" className="font-semibold hover:underline" style={{ color: "#00b096" }}>
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Category jump links */}
      <div className="border-b border-gray-100 bg-white px-6 py-4 md:px-12">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
          {CATEGORIES.map(cat => (
            <a
              key={cat.title}
              href={`#${cat.title.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#00b096] hover:text-[#00b096]"
            >
              {cat.emoji} {cat.title}
            </a>
          ))}
        </div>
      </div>

      {/* Services quick-reference */}
      <div className="bg-white px-6 py-10 md:px-12">
        <div className="mx-auto max-w-4xl">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-center" style={{ color: "#00b096" }}>Our services</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(SERVICE_META) as [keyof typeof SERVICE_META, typeof SERVICE_META[keyof typeof SERVICE_META]][]).map(([slug, svc]) => (
              <div key={slug} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="text-2xl">{svc.emoji}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: "#0a2e30" }}>{svc.name}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{svc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ sections */}
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16 space-y-12">
        {CATEGORIES.map(cat => (
          <section key={cat.title} id={cat.title.toLowerCase().replace(/\s+/g, "-")}>
            <div className="mb-5 flex items-center gap-3">
              <span className="text-2xl">{cat.emoji}</span>
              <h2 className="text-xl font-extrabold" style={{ color: "#0a2e30" }}>{cat.title}</h2>
            </div>

            <div className="space-y-2">
              {cat.items.map(item => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold select-none" style={{ color: "#0a2e30" }}>
                    <span>{item.q}</span>
                    <span
                      className="shrink-0 rounded-full p-1 transition group-open:rotate-45"
                      style={{ backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </span>
                  </summary>
                  <div className="border-t border-gray-50 px-5 py-4 text-sm leading-relaxed text-gray-600">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* Still need help */}
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "#0a2e30" }}>
          <p className="text-lg font-extrabold text-white">Still have a question?</p>
          <p className="mt-2 text-sm text-white/60">Our support team is here to help.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:support@dogcaregh.com"
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              Email support
            </a>
            <a
              href="tel:0548667516"
              className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              054 866 7516
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400 md:px-12">
        © {new Date().getFullYear()} DogCareGH · 888 Capital City Ventures.
        <span className="mx-2">·</span>
        <Link href="/how-it-works" className="hover:underline">How It Works</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:underline">Terms</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <span className="mx-2">·</span>
        <Link href="/contact" className="hover:underline">Contact</Link>
      </footer>
    </div>
  );
}
