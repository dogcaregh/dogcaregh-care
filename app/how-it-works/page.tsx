"use client";

import { useState } from "react";
import Link from "next/link";

const DOG_SVG = (
  <svg viewBox="0 0 100 100" fill="currentColor">
    <ellipse cx="50" cy="63" rx="24" ry="20"/>
    <ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/>
    <ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/>
    <ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/>
    <ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/>
  </svg>
);

const OWNER_STEPS = [
  {
    emoji: "📝",
    title: "Create an account",
    desc: "Sign up as a pet owner in under a minute. Add your dog's name, breed, size, and any special needs.",
  },
  {
    emoji: "🔍",
    title: "Search near you",
    desc: "Browse verified carers in your neighbourhood. Filter by service type — walking, grooming, daycare, and more.",
  },
  {
    emoji: "📋",
    title: "Compare & choose",
    desc: "Read verified reviews, check star ratings, view photos, and see exactly what each carer offers and charges.",
  },
  {
    emoji: "📅",
    title: "Book & pay securely",
    desc: "Request a booking, confirm the dates and your dog, then pay safely via mobile money or card through Paystack.",
  },
  {
    emoji: "⭐",
    title: "Rate your experience",
    desc: "After the service, leave a review. Your feedback helps other pet owners and rewards great carers.",
  },
];

const CARER_STEPS = [
  {
    emoji: "📝",
    title: "Create a carer account",
    desc: "Register as a provider with your name, location, and a short bio about your experience with dogs.",
  },
  {
    emoji: "🛠️",
    title: "Set up your services",
    desc: "Choose which services you offer, set your rates by dog size, add your weekly availability, and upload photos of your space.",
  },
  {
    emoji: "✅",
    title: "Apply for verification",
    desc: "Submit your Ghana Card, home address, and two personal references. We review every application to keep the platform trusted.",
  },
  {
    emoji: "🟢",
    title: "Go live",
    desc: "Once approved, your profile appears in search results and pet owners in your area can start booking you.",
  },
  {
    emoji: "💰",
    title: "Get paid",
    desc: "Complete bookings, build your reviews, and request payouts directly to your mobile money account.",
  },
];

const TRUST_ITEMS = [
  {
    emoji: "🛡️",
    title: "Verified carers only",
    desc: "Every carer submits a Ghana Card, address proof, and personal references before going live.",
  },
  {
    emoji: "🔒",
    title: "Secure payments",
    desc: "All payments go through Paystack — Ghana's leading payment gateway. Mobile money, card, or bank transfer.",
  },
  {
    emoji: "⭐",
    title: "Real reviews",
    desc: "Reviews can only be left by owners who completed a booking. No fake ratings.",
  },
  {
    emoji: "⚖️",
    title: "Dispute resolution",
    desc: "If anything goes wrong, our team steps in. Refunds are processed fairly based on our cancellation policy.",
  },
];

export default function HowItWorksPage() {
  const [tab, setTab] = useState<"owner" | "carer">("owner");
  const steps = tab === "owner" ? OWNER_STEPS : CARER_STEPS;

  return (
    <main className="font-sans" style={{ backgroundColor: "#f8fafb" }}>

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Log In
          </Link>
          <Link
            href="/register/owner"
            className="rounded-full px-4 py-1.5 text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ── Hero band ── */}
      <div className="relative overflow-hidden px-6 pb-14 pt-14 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden="true">
          <div style={{ position:"absolute", width:140, top:"-16px", right:"4%", opacity:0.055, color:"#00b096", transform:"rotate(18deg)" }}>{DOG_SVG}</div>
          <div style={{ position:"absolute", width:90, bottom:"-10px", left:"3%", opacity:0.05, color:"white", transform:"rotate(-20deg)" }}>{DOG_SVG}</div>
          <div style={{ position:"absolute", width:58, top:"38%", left:"10%", opacity:0.04, color:"#00b096", transform:"rotate(36deg)" }}>{DOG_SVG}</div>
        </div>
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
            Getting started
          </p>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">
            How DogCareGH works
          </h1>
          <p className="mt-4 text-base text-white/60 md:text-lg">
            Whether you&apos;re looking for care for your dog or want to earn as a carer, we&apos;ve made it simple.
          </p>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="mx-auto mt-10 max-w-xs px-4">
        <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
          {(["owner", "carer"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition"
              style={
                tab === t
                  ? { backgroundColor: "#0a2e30", color: "#fff" }
                  : { color: "#9ca3af" }
              }
            >
              {t === "owner" ? "Pet Owners" : "Pet Carers"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-7 top-8 hidden h-[calc(100%-4rem)] w-px md:block"
            style={{ backgroundColor: "#e5e7eb" }}
          />

          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-5">
                {/* Number circle */}
                <div
                  className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm"
                  style={{ backgroundColor: "#0a2e30", color: "#00b096" }}
                >
                  {step.emoji}
                </div>
                {/* Content */}
                <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: "rgba(0,176,150,.12)", color: "#00b096" }}
                    >
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-extrabold" style={{ color: "#0a2e30" }}>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA after steps */}
        <div className="mt-10 text-center">
          {tab === "owner" ? (
            <Link
              href="/search"
              className="inline-block rounded-full px-8 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              Find a Carer Near You
            </Link>
          ) : (
            <Link
              href="/register/provider"
              className="inline-block rounded-full px-8 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              Become a Carer
            </Link>
          )}
        </div>
      </div>

      {/* ── Trust & Safety ── */}
      <div className="bg-white px-6 py-16 md:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
            Your peace of mind
          </p>
          <h2 className="mb-12 text-center text-2xl font-extrabold md:text-3xl" style={{ color: "#0a2e30" }}>
            Trust &amp; Safety
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-100 p-6 shadow-sm"
                style={{ borderTopWidth: 3, borderTopColor: "#00b096" }}
              >
                <div className="mb-3 text-3xl">{item.emoji}</div>
                <h3 className="mb-2 text-sm font-bold" style={{ color: "#0a2e30" }}>{item.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="relative overflow-hidden px-6 py-16 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden="true">
          <div style={{ position:"absolute", width:110, top:"-12px", right:"5%", opacity:0.055, color:"#00b096", transform:"rotate(15deg)" }}>{DOG_SVG}</div>
          <div style={{ position:"absolute", width:70, bottom:"-8px", left:"4%", opacity:0.05, color:"white", transform:"rotate(-18deg)" }}>{DOG_SVG}</div>
        </div>
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="mb-4 text-2xl font-extrabold text-white md:text-3xl">
            Ready to get started?
          </h2>
          <p className="mb-8 text-white/60">
            Join pet owners and carers already using DogCareGH across Accra.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/search"
              className="rounded-full px-8 py-3.5 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
            >
              Find a Carer
            </Link>
            <Link
              href="/register/provider"
              className="rounded-full border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Become a Carer
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400 md:px-12">
        © {new Date().getFullYear()} DogCareGH. All rights reserved.
        <span className="mx-2">·</span>
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">·</span>
        <Link href="/search" className="hover:underline">Find a Carer</Link>
      </footer>
    </main>
  );
}
