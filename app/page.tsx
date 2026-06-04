"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ACCRA_AREAS } from "@/lib/geocode";

const services = [
  { emoji: "🐾", name: "Dog Sitting",  id: "dog_sitting",  description: "A trusted sitter cares for your dog in their own home while you're away."  },
  { emoji: "🏡", name: "Dog Daycare",  id: "dog_daycare",  description: "Socialisation and supervised play for your dog during the day."              },
  { emoji: "🛏️", name: "Dog Overnight", id: "dog_boarding", description: "Overnight stays in a comfortable home."                                    },
  { emoji: "✂️", name: "Dog Grooming", id: "dog_grooming", description: "Professional grooming services for your dog."                                },
  { emoji: "🦮", name: "Dog Walking",  id: "dog_walking",  description: "Daily walks to keep your dog happy, healthy, and well-exercised."            },
];

type AuthUser = { name: string; isProvider: boolean } | null;

export default function HomePage() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser>(undefined as unknown as AuthUser);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadAuth() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setAuthUser(null); return; }

      const [{ data: u }, { data: p }] = await Promise.all([
        sb.from("users").select("name").eq("id", user.id).single(),
        sb.from("providers").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      setAuthUser({ name: (u as { name: string } | null)?.name ?? "", isProvider: !!p });
    }
    loadAuth();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    router.push(`/search?${params.toString()}`);
  }

  function handleServiceClick(serviceId: string) {
    router.push(`/search?service=${serviceId}`);
  }

  async function handleSignOut() {
    await createClient().auth.signOut();
    setAuthUser(null);
  }

  const authLoaded = authUser !== (undefined as unknown as AuthUser);

  return (
    <main className="font-sans">
      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col" style={{ backgroundColor: "#0a2e30" }}>
        {/* Fullscreen background photo */}
        <img
          src="/homepage.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />
        {/* 70% dark-green blend overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: "rgba(10, 46, 48, 0.50)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(0,176,150,0.18) 0%, transparent 70%)" }}
        />

        {/* ── Dog aesthetic decorations ── */}
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden="true">
          <svg style={{position:"absolute",width:165,top:"8%",right:"5%",opacity:0.055,color:"#00b096",transform:"rotate(22deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:122,bottom:"18%",left:"-14px",opacity:0.05,color:"white",transform:"rotate(-18deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:64,top:"42%",left:"9%",opacity:0.045,color:"#00b096",transform:"rotate(38deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:48,top:"14px",left:"23%",opacity:0.04,color:"white",transform:"rotate(-6deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:56,bottom:"55px",left:"43%",opacity:0.04,color:"#00b096",transform:"rotate(-42deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:80,top:"25%",right:"15%",opacity:0.035,color:"white",transform:"rotate(10deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        </div>

        {/* ── Nav ── */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
          <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />

          <div className="flex items-center gap-3">
            {!authLoaded ? null : authUser ? (
              <>
                <Link
                  href={authUser.isProvider ? "/dashboard/provider" : "/dashboard/owner"}
                  className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 md:px-4 md:py-2 md:text-sm"
                >
                  My Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 md:px-4 md:py-2 md:text-sm"
                  style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 md:px-5 md:py-2 md:text-sm"
                >
                  Log In
                </Link>
                <Link
                  href="/register/owner"
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 md:px-5 md:py-2 md:text-sm"
                  style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <p
            className="mb-4 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: "rgba(0,176,150,0.35)", color: "#80d8cb" }}
          >
            Ghana&apos;s #1 Pet Care Network
          </p>

          <h1 className="text-balance max-w-3xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
            Trusted pet care, right in your{" "}
            <span style={{ color: "#00b096" }}>neighbourhood</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-white/70">
            Connect with vetted, passionate pet caregivers across Accra and beyond.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-8 flex w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl shadow-black/30 md:mt-10 md:rounded-2xl">
            <span className="flex items-center pl-3 text-base md:pl-5 md:text-xl">📍</span>
            <input
              ref={inputRef}
              type="text"
              list="home-accra-areas"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Enter your neighbourhood…"
              className="flex-1 bg-transparent px-3 py-3 text-xs placeholder-gray-400 outline-none md:px-4 md:py-4 md:text-sm"
              style={{ color: "#0a2e30" }}
              autoComplete="off"
            />
            <datalist id="home-accra-areas">
              {ACCRA_AREAS.map(a => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <button
              type="submit"
              className="m-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 md:m-2 md:rounded-xl md:px-6 md:py-3 md:text-sm"
              style={{ backgroundColor: "#00b096" }}
            >
              Search
            </button>
          </form>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#services"
              className="rounded-full px-8 py-3.5 text-sm font-semibold shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
            >
              Find Care
            </a>
            <a
              href="#become-provider"
              className="rounded-full border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Become a Provider
            </a>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="bg-white px-6 py-20 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
            What we offer
          </p>
          <h2 className="mb-4 text-center text-3xl font-extrabold md:text-4xl" style={{ color: "#0a2e30" }}>
            Services for every pet &amp; lifestyle
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-gray-500">
            Whether you need someone for a few hours or a few weeks, we have a service that fits.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {services.map((svc) => (
              <button
                key={svc.name}
                onClick={() => handleServiceClick(svc.id)}
                className="group flex cursor-pointer flex-col items-center rounded-2xl border border-gray-100 p-6 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                style={{ borderTopColor: "#00b096", borderTopWidth: 3 }}
              >
                <span className="mb-4 text-4xl">{svc.emoji}</span>
                <h3 className="mb-2 text-base font-bold" style={{ color: "#0a2e30" }}>{svc.name}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{svc.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works (compact) ── */}
      <section className="px-6 py-16 md:px-12" style={{ backgroundColor: "#f8fafb" }}>
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>
            Simple &amp; secure
          </p>
          <h2 className="mb-12 text-center text-2xl font-extrabold md:text-3xl" style={{ color: "#0a2e30" }}>
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { emoji: "🔍", step: "1", title: "Find a carer", desc: "Search verified carers in your neighbourhood by service type and availability." },
              { emoji: "📅", step: "2", title: "Book & pay", desc: "Request a booking and pay securely via mobile money or card through Paystack." },
              { emoji: "⭐", step: "3", title: "Relax", desc: "Your dog is in trusted hands. Rate your experience when the service is done." },
            ].map(item => (
              <div key={item.step} className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-sm">
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: "rgba(0,176,150,.12)" }}
                >
                  {item.emoji}
                </div>
                <span className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#00b096" }}>
                  Step {item.step}
                </span>
                <h3 className="mb-2 text-base font-extrabold" style={{ color: "#0a2e30" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/how-it-works"
              className="text-sm font-semibold transition hover:opacity-70"
              style={{ color: "#00b096" }}
            >
              See the full guide for owners &amp; carers →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Become a Provider CTA ── */}
      <section id="become-provider" className="relative overflow-hidden px-6 py-20 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden="true">
          <svg style={{position:"absolute",width:130,top:"-20px",right:"3%",opacity:0.055,color:"#00b096",transform:"rotate(15deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:90,bottom:"-10px",left:"4%",opacity:0.05,color:"white",transform:"rotate(-22deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:60,top:"35%",left:"2%",opacity:0.04,color:"#00b096",transform:"rotate(40deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{position:"absolute",width:70,top:"20%",right:"18%",opacity:0.04,color:"white",transform:"rotate(-10deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        </div>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">
            Love animals? Earn doing what you love.
          </h2>
          <p className="mb-8 text-white/70">
            Join hundreds of pet care providers across Ghana and start earning on your own schedule.
          </p>
          <Link
            href="/register/provider"
            className="inline-block rounded-full px-10 py-4 text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
          >
            Become a Provider
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400 md:px-12">
        © {new Date().getFullYear()} DogCareGH. All rights reserved.
        <span className="mx-2">·</span>
        <Link href="/how-it-works" className="hover:underline">How It Works</Link>
      </footer>
    </main>
  );
}
