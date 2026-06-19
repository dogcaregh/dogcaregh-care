import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description: "DogCareGH began with a simple question: who will love my dog the way I do? We are a growing community of verified, dog-loving caregivers across Ghana.",
  openGraph: {
    title: "About DogCareGH — Trusted Dog Care in Ghana",
    description: "We are a growing community of verified, dog-loving caregivers across Ghana, here for the everyday moments a dog's life is made of.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-10 w-auto" /></Link>
          <Link href="/" className="text-xs font-semibold text-white/70 transition hover:text-white">← Back to home</Link>
        </div>
      </nav>

      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 py-20 md:px-12 md:py-28"
        style={{ backgroundImage: "url(/dog-register.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(10,46,48,0.84)" }} aria-hidden="true" />
        {/* Decorative dog silhouettes */}
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden="true">
          <svg style={{ position:"absolute", width:180, top:"-20px", right:"4%", opacity:0.05, color:"#00b096", transform:"rotate(15deg)" }} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
          <svg style={{ position:"absolute", width:90, bottom:"10%", left:"2%", opacity:0.045, color:"white", transform:"rotate(-20deg)" }} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Our Story</p>
          <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Trusted Dog Care<br className="hidden sm:block" /> in Ghana
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            Every dog owner knows the feeling. You have to travel, or work runs late, or life simply pulls
            you somewhere your dog can&apos;t follow — and the same question walks out the door with you:{" "}
            <em>who will love my dog the way I do?</em>
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            That question is where DogCareGH begins.
          </p>
        </div>
      </div>

      {/* Community intro */}
      <div className="border-b border-gray-100 bg-white px-6 py-12 md:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-base leading-relaxed text-gray-600 md:text-lg">
            We are a growing community of verified, dog-loving caregivers across Ghana, here for the
            everyday moments a dog&apos;s life is made of — dog sitting, doggy daycare, overnight stays,
            mobile grooming, and dog walking. Whatever you need, you can find someone who will treat
            your dog the way you would: <strong style={{ color: "#0a2e30" }}>like family</strong>.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16 md:px-8 md:py-20 space-y-16">

        {/* How it started */}
        <section>
          <div className="mb-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00b096" }}>How it started</p>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="relative mb-8 h-64 overflow-hidden rounded-2xl shadow-sm md:h-80">
            <Image src="/dog-care.jpg" alt="A dog being cared for" fill className="object-cover" />
          </div>

          <div className="space-y-6 text-base leading-relaxed text-gray-600">
            <p>
              I never planned any of this. I just loved dogs.
            </p>
            <p>
              For years I was simply the person who understood them. People found me — a call here,
              a message there, a friend of a friend whose dog wouldn&apos;t settle — and I gave whatever
              advice I could, freely and gladly. I didn&apos;t think of it as a business. I thought of it
              as a thing I was lucky to be good at. But the calls kept coming, and somewhere in all of
              them I heard something real: people here love their dogs deeply, and they were quietly
              searching for someone they could trust. In 2021, I made it my profession.
            </p>

            {/* Pull quote */}
            <blockquote className="my-8 rounded-2xl px-8 py-7" style={{ backgroundColor: "rgba(0,176,150,.07)", borderLeft: "4px solid #00b096" }}>
              <p className="text-lg font-semibold italic leading-relaxed" style={{ color: "#0a2e30" }}>
                &ldquo;If there&apos;s one thing those years taught me, it&apos;s that none of this runs on skill.
                It runs on trust. No one hands you their dog because of a price. They hand you their
                dog because they believe, all the way down, that you will care for it as they would.&rdquo;
              </p>
            </blockquote>

            <p>
              There is a particular kind of love between a person and their dog — patient, loyal,
              asking for little and giving back more than it ever takes — and to be let into it is a
              quiet honour. I have watched that love up close in homes all across this country.
              Whatever anyone says about how we relate to dogs in this part of the world, I have seen
              the truth: the bond here is real, and it runs deep.
            </p>
            <p>
              As that trust grew, people began to ask me for more than training. Could I keep their
              dog while they travelled? Open a daycare so they could drop off on the way to work?
              Find them a groomer, a walker, someone gentle to sit with their dog at home? I wanted
              to say yes to all of it.
            </p>
            <p>
              But I am one person. Time and again I had to turn good people away — people who only
              wanted the best for a dog they loved — and every &ldquo;no&rdquo; sat heavy with me. That
              frustration is the honest seed of DogCareGH. I kept asking how one person&apos;s limits
              could become many people&apos;s answer.{" "}
              <strong style={{ color: "#0a2e30" }}>This is that answer</strong>: a place that gathers
              trusted, caring hands together, so that no dog owner in Ghana ever has to be turned
              away again.
            </p>
          </div>
        </section>

        {/* GH meaning */}
        <section>
          <div className="mb-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00b096" }}>&ldquo;Givers Hub&rdquo;</p>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <p className="mb-8 text-center text-base leading-relaxed text-gray-600">
            The <strong style={{ color: "#0a2e30" }}>GH</strong> in DogCareGH means two things.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
                style={{ backgroundColor: "#0a2e30" }}
              >
                GH
              </div>
              <h3 className="mb-2 text-base font-extrabold" style={{ color: "#0a2e30" }}>Ghana</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Because this is where we begin. Built here, for here — for the dog owners and dog
                lovers of Ghana.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
                style={{ backgroundColor: "#00b096" }}
              >
                GH
              </div>
              <h3 className="mb-2 text-base font-extrabold" style={{ color: "#0a2e30" }}>Givers Hub</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                That one sits closer to the heart of it. Dog owners are givers. Dogs are givers.
                And the caregivers here — verified dog lovers every one — are givers too, pouring
                real purpose into real work.
              </p>
            </div>
          </div>
        </section>

        {/* Where we're going */}
        <section>
          <div className="mb-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00b096" }}>Where we&apos;re going</p>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="rounded-2xl p-8 md:p-10" style={{ backgroundColor: "#0a2e30" }}>
            <p className="text-base leading-relaxed text-white/80 md:text-lg">
              The truth is, the real work is only beginning. We&apos;re not here to make big promises.
              We&apos;re here to prove, one dog and one happy owner at a time, what good care can feel
              like — and to add a little more quality of life to our furry friends, and to everyone
              who loves them.
            </p>
            <p className="mt-4 text-sm font-semibold" style={{ color: "#00b096" }}>
              That has always been the whole point.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <p className="mb-6 text-sm text-gray-500">Ready to find trusted care, or become a care provider?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/search"
              className="rounded-full px-8 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00b096" }}
            >
              Find a care provider
            </Link>
            <Link
              href="/register/provider"
              className="rounded-full border border-gray-200 px-8 py-3.5 text-sm font-semibold transition hover:border-[#00b096] hover:text-[#00b096]"
              style={{ color: "#0a2e30" }}
            >
              Become a care provider
            </Link>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400 md:px-12">
        © {new Date().getFullYear()} DogCareGH · 888 Capital City Ventures.
        <span className="mx-2">·</span>
        <Link href="/how-it-works" className="hover:underline">How It Works</Link>
        <span className="mx-2">·</span>
        <Link href="/faq" className="hover:underline">FAQ</Link>
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
