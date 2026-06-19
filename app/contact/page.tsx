import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with DogCareGH. We're here to help with bookings, provider support, disputes, and general enquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-10 w-auto" /></Link>
          <Link href="/" className="text-xs font-semibold text-white/70 transition hover:text-white">← Back to home</Link>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>We&apos;re here to help</p>
          <h1 className="text-3xl font-extrabold md:text-4xl" style={{ color: "#0a2e30" }}>Contact Us</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-gray-500">
            Have a question, a problem with a booking, or feedback about the platform? Reach out — we typically respond within 24 hours on business days.
          </p>
        </div>

        {/* Contact card */}
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ backgroundColor: "rgba(0,176,150,.12)" }}
          >
            ✉️
          </div>
          <h2 className="mb-2 text-lg font-extrabold" style={{ color: "#0a2e30" }}>Email Support</h2>
          <p className="mb-5 text-sm text-gray-500">For all enquiries — bookings, accounts, payments, disputes, and general feedback.</p>
          <a
            href="mailto:support@dogcaregh.com"
            className="inline-block rounded-full px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#00b096" }}
          >
            support@dogcaregh.com
          </a>
          <p className="mt-3 text-sm font-medium" style={{ color: "#0a2e30" }}>or call <a href="tel:0548667516" className="hover:underline" style={{ color: "#00b096" }}>054 866 7516</a></p>
          <p className="mt-1 text-xs text-gray-400">Response time: within 24 hours on business days (Mon – Fri)</p>
        </div>

        {/* Topic cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              emoji: "📋",
              title: "Bookings & Payments",
              desc: "Issues with a booking, payment not going through, or refund requests.",
            },
            {
              emoji: "🐾",
              title: "Provider Support",
              desc: "Verification questions, payout issues, profile help, or account access.",
            },
            {
              emoji: "⚠️",
              title: "Disputes & Safety",
              desc: "Report a safety concern, raise a dispute, or report a problem user.",
            },
          ].map(item => (
            <a
              key={item.title}
              href="mailto:support@dogcaregh.com"
              className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <span className="mb-3 text-3xl">{item.emoji}</span>
              <p className="mb-1 text-sm font-bold" style={{ color: "#0a2e30" }}>{item.title}</p>
              <p className="text-xs leading-relaxed text-gray-400">{item.desc}</p>
            </a>
          ))}
        </div>

        {/* Quick links */}
        <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-bold" style={{ color: "#0a2e30" }}>Quick links</p>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/how-it-works", label: "How It Works" },
              { href: "/terms", label: "Terms of Service" },
              { href: "/privacy", label: "Privacy Policy" },
              { href: "/search", label: "Find a care provider" },
              { href: "/register/provider", label: "Become a Provider" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#00b096] hover:text-[#00b096]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400 md:px-12">
        © {new Date().getFullYear()} DogCareGH · 888 Capital City Ventures.
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
