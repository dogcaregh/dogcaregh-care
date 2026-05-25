const services = [
  {
    emoji: "🐾",
    name: "Pet Sitting",
    description: "A trusted sitter cares for your pet in their own home while you're away.",
  },
  {
    emoji: "🏡",
    name: "Doggy Daycare",
    description: "Socialisation and supervised play for your dog during the day.",
  },
  {
    emoji: "🛏️",
    name: "Dog Boarding",
    description: "Overnight stays in a comfortable home — no kennels, ever.",
  },
  {
    emoji: "✂️",
    name: "Mobile Grooming",
    description: "Professional grooming that comes straight to your door.",
  },
  {
    emoji: "🦮",
    name: "Dog Walking",
    description: "Daily walks to keep your dog happy, healthy, and well-exercised.",
  },
];

export default function HomePage() {
  return (
    <main className="font-sans">
      {/* ── Hero ── */}
      <section
        className="relative min-h-screen flex flex-col"
        style={{ backgroundColor: "#0a2e30" }}
      >
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(0,176,150,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
          <span className="text-2xl font-bold tracking-tight text-white">
            Dog<span style={{ color: "#00b096" }}>Care</span>GH
          </span>
          <div className="flex gap-3">
            <a
              href="#services"
              className="rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Browse Services
            </a>
            <a
              href="#become-provider"
              className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
            >
              Become a Provider
            </a>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <p
            className="mb-4 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: "rgba(0,176,150,0.15)", color: "#00b096" }}
          >
            Ghana&apos;s #1 Pet Care Marketplace
          </p>

          <h1 className="text-balance max-w-3xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
            Trusted pet care, right in your{" "}
            <span style={{ color: "#00b096" }}>neighbourhood</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-white/70">
            Connect with vetted, passionate pet caregivers across Accra, Kumasi,
            and beyond.
          </p>

          {/* Location search */}
          <div className="mt-10 flex w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30">
            <span className="flex items-center pl-5 text-xl">📍</span>
            <input
              type="text"
              placeholder="Enter your neighbourhood or city…"
              className="flex-1 bg-transparent px-4 py-4 text-sm placeholder-gray-400 outline-none"
              style={{ color: "#0a2e30" }}
            />
            <button
              className="m-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              Search
            </button>
          </div>

          {/* CTA pair */}
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

          {/* Scroll hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="bg-white px-6 py-20 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p
            className="mb-3 text-center text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#00b096" }}
          >
            What we offer
          </p>
          <h2
            className="mb-4 text-center text-3xl font-extrabold md:text-4xl"
            style={{ color: "#0a2e30" }}
          >
            Services for every pet &amp; lifestyle
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-gray-500">
            Whether you need someone for a few hours or a few weeks, we have a
            service that fits.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="group flex cursor-pointer flex-col items-center rounded-2xl border border-gray-100 p-6 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                style={{ borderTopColor: "#00b096", borderTopWidth: 3 }}
              >
                <span className="mb-4 text-4xl">{svc.emoji}</span>
                <h3
                  className="mb-2 text-base font-bold"
                  style={{ color: "#0a2e30" }}
                >
                  {svc.name}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {svc.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Become a Provider CTA ── */}
      <section
        id="become-provider"
        className="px-6 py-20 md:px-12"
        style={{ backgroundColor: "#0a2e30" }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">
            Love animals? Earn doing what you love.
          </h2>
          <p className="mb-8 text-white/70">
            Join hundreds of pet care providers across Ghana and start earning on
            your own schedule.
          </p>
          <a
            href="#"
            className="inline-block rounded-full px-10 py-4 text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: "#00b096", color: "#0a2e30" }}
          >
            Become a Provider
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400 md:px-12">
        © {new Date().getFullYear()} DogCareGH. All rights reserved.
      </footer>
    </main>
  );
}
