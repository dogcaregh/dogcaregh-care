import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how DogCareGH (888 Capital City Ventures) collects, uses, and protects your personal data in accordance with Ghana's Data Protection Act 2012 (Act 843).",
};

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
          style={{ backgroundColor: "#00b096" }}
        >
          {num}
        </span>
        <h2 className="text-lg font-extrabold" style={{ color: "#0a2e30" }}>{title}</h2>
      </div>
      <div className="pl-11">{children}</div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm leading-relaxed text-gray-600">
      <span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-5 text-sm font-bold" style={{ color: "#0a2e30" }}>{children}</p>;
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-xl border-l-4 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600" style={{ borderLeftColor: "#00b096" }}>
      {children}
    </div>
  );
}

export default function PrivacyPage() {
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
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Legal</p>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">Privacy Policy</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
            This policy explains, in plain language, what personal information DogCareGH collects, why we collect it,
            who we share it with, and the choices and rights you have. We handle your data in line with Ghana&apos;s
            Data Protection Act, 2012 (Act 843).
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-white/40">
            <span>Effective 7 June 2026</span>
            <span>·</span>
            <span>Last updated 7 June 2026</span>
            <span>·</span>
            <span>Applies to dogcaregh.com</span>
          </div>
        </div>
      </div>

      {/* Intro callout */}
      <div className="border-b border-gray-100 px-6 py-6 md:px-12">
        <div className="mx-auto max-w-4xl">
          <Callout>
            DogCareGH connects dog owners across Ghana with trusted care providers for sitting, daycare, overnight stays,
            mobile grooming, and walking. To do that safely, we handle personal information — yours, and in some cases
            your dog&apos;s. We take that responsibility seriously. This document tells you exactly how.
          </Callout>
        </div>
      </div>

      {/* Table of contents */}
      <div className="border-b border-gray-100 bg-white px-6 py-6 md:px-12">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Contents</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {[
              ["1", "Who we are"],
              ["2", "The personal data we collect"],
              ["3", "How and why we use your data"],
              ["4", "Sensitive personal data"],
              ["5", "Payments"],
              ["6", "How we share your data"],
              ["7", "Storing data outside Ghana"],
              ["8", "How long we keep your data"],
              ["9", "How we protect your data"],
              ["10", "Your rights"],
              ["11", "Children"],
              ["12", "Cookies"],
              ["13", "Changes to this policy"],
              ["14", "How to contact us"],
            ].map(([num, title]) => (
              <p key={num} className="text-sm text-gray-500">
                <span className="font-semibold" style={{ color: "#00b096" }}>{num}.</span> {title}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div className="space-y-10 rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm md:px-10">

          <Section num="1" title="Who we are">
            <p className="text-sm leading-relaxed text-gray-600">
              DogCareGH is a pet-care marketplace operated by <strong>888 Capital City Ventures</strong> (&ldquo;DogCareGH&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). When you use our website and services, we are the &ldquo;data controller&rdquo; responsible for your personal data under Ghana&apos;s Data Protection Act, 2012 (Act 843).
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              For any privacy question or request, you can reach us at <a href="mailto:support@dogcaregh.com" className="font-semibold hover:underline" style={{ color: "#00b096" }}>support@dogcaregh.com</a>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              The <strong>Data Protection Commission of Ghana (DPC)</strong> is the authority that oversees data protection in Ghana. You have the right to contact them about how we handle your data — their details are in section 14.
            </p>
          </Section>

          <hr className="border-gray-100" />

          <Section num="2" title="The personal data we collect">
            <p className="text-sm leading-relaxed text-gray-600">
              We only collect what we need to run the service, keep it safe, and pay people correctly. The information differs depending on whether you are a dog owner or a care provider.
            </p>

            <SubHeading>If you are a dog owner</SubHeading>
            <ul className="space-y-2">
              <Bullet><strong>Account details</strong> — your name, email address, phone number, password, and the neighbourhood or area you are in.</Bullet>
              <Bullet><strong>Your dog&apos;s profile</strong> — name, breed, size, and any special needs or medical information you choose to share so a care provider can look after them properly.</Bullet>
              <Bullet><strong>Booking activity</strong> — the services you request, dates, the care providers you book, messages, and the reviews you leave.</Bullet>
            </ul>

            <SubHeading>If you are a care provider</SubHeading>
            <p className="mb-2 text-sm leading-relaxed text-gray-600">
              Because owners trust care providers with their dogs and sometimes their homes, care providers go through verification and provide more information:
            </p>
            <ul className="space-y-2">
              <Bullet><strong>Identity</strong> — your Ghana Card details, which we verify against the national database, and a selfie taken in the app to confirm the card belongs to you.</Bullet>
              <Bullet><strong>Contact</strong> — your phone number, confirmed by a one-time code.</Bullet>
              <Bullet><strong>Payout details</strong> — your Mobile Money account, in your own name, so we can pay you.</Bullet>
              <Bullet><strong>Proof of address</strong> — such as a utility bill, tenancy agreement, or a signed note from an assembly member or community elder.</Bullet>
              <Bullet><strong>References</strong> — the names and phone numbers of two people who can speak to your character, whom we may contact.</Bullet>
              <Bullet><strong>A passport photo</strong> for your care provider profile.</Bullet>
              <Bullet><strong>For home services</strong> (daycare, sitting, overnight) — photos and a short video of the space where dogs would stay, and a rabies vaccination certificate for any dog of your own that shares the space.</Bullet>
              <Bullet><strong>Optional</strong> — a Police Clearance Certificate, if you choose to earn the Police-Cleared badge, and later a TIN and registered business name as you formalise your business.</Bullet>
            </ul>

            <SubHeading>Information about other people</SubHeading>
            <p className="text-sm leading-relaxed text-gray-600">
              When a care provider gives us the contact details of references, the care provider confirms they have those people&apos;s permission to share their name and phone number with us. We use those details only to carry out reference checks.
            </p>

            <SubHeading>Payment information</SubHeading>
            <p className="text-sm leading-relaxed text-gray-600">
              Payments are processed by Paystack. We do <strong>not</strong> see or store your full card number or Mobile Money PIN. We keep records of your transactions — amounts, dates, and status — to manage bookings, payouts, refunds, and disputes.
            </p>

            <SubHeading>Information we collect automatically</SubHeading>
            <ul className="space-y-2">
              <Bullet><strong>Device and usage data</strong> — such as your device type, browser, approximate location from your IP address, and how you use the site.</Bullet>
              <Bullet><strong>Cookies</strong> — small files that keep you logged in and the site secure (see section 12).</Bullet>
            </ul>
          </Section>

          <hr className="border-gray-100" />

          <Section num="3" title="How and why we use your data">
            <p className="mb-3 text-sm leading-relaxed text-gray-600">
              Under Act 843, we must have a lawful reason to use your data. Here is what we use it for and why:
            </p>
            <ul className="space-y-2">
              <Bullet><strong>To provide the service</strong> — creating your account, matching owners with care providers, managing bookings and your dog&apos;s profile. <em className="text-gray-400">(To perform our agreement with you.)</em></Bullet>
              <Bullet><strong>To verify care providers and keep everyone safe</strong> — checking identity, references, and home spaces so owners can trust the people on the platform. <em className="text-gray-400">(Our legitimate interest in trust and safety, and your consent for sensitive information.)</em></Bullet>
              <Bullet><strong>To process payments and payouts</strong> — taking payment securely and paying care providers to their Mobile Money. <em className="text-gray-400">(To perform our agreement with you.)</em></Bullet>
              <Bullet><strong>To communicate with you</strong> — booking confirmations, reminders, receipts, and support messages by email, WhatsApp, or SMS. <em className="text-gray-400">(To perform our agreement, and our legitimate interest in running the service.)</em></Bullet>
              <Bullet><strong>To handle disputes and refunds</strong> — stepping in fairly when something goes wrong, based on our cancellation policy.</Bullet>
              <Bullet><strong>To meet legal and tax obligations</strong> — keeping records the law requires us to keep.</Bullet>
              <Bullet><strong>To improve DogCareGH</strong> — understanding how the service is used so we can make it better. <em className="text-gray-400">(Our legitimate interest.)</em></Bullet>
              <Bullet><strong>To send you offers or updates</strong> — only if you have agreed to receive them, and you can opt out at any time. <em className="text-gray-400">(Your consent.)</em></Bullet>
            </ul>
          </Section>

          <hr className="border-gray-100" />

          <Section num="4" title="Sensitive personal data">
            <p className="text-sm leading-relaxed text-gray-600">
              Some of the information care providers give us is sensitive — your Ghana Card, your selfie, and any Police Clearance Certificate. We collect this only for identity verification and the safety of dogs, owners, and care providers.
            </p>
            <Callout>
              <strong>How we treat it:</strong> we ask for your consent before collecting it, we limit who can see it, we use it only for verification and safety, and we do not share it with other users. Your verified status (for example, a badge) is shown publicly — but your underlying ID documents are not.
            </Callout>
          </Section>

          <hr className="border-gray-100" />

          <Section num="5" title="Payments">
            <p className="text-sm leading-relaxed text-gray-600">
              All payments run through <strong>Paystack</strong>, a licensed payment provider, by Mobile Money, card, or bank transfer. Your full payment credentials are handled by Paystack, not stored by us.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              When you book, your payment is held securely and released to the care provider after the service is completed. If a booking is cancelled, refunds are handled according to our cancellation policy.
            </p>
          </Section>

          <hr className="border-gray-100" />

          <Section num="6" title="How we share your data">
            <p className="mb-3 text-sm leading-relaxed text-gray-600">We do not sell your personal data. We share it only in these situations:</p>
            <ul className="space-y-2">
              <Bullet><strong>With other users, to make a booking work</strong> — once a booking is confirmed, an owner and care provider can see the details they need (for example, the owner&apos;s name and the dog&apos;s profile, and the care provider&apos;s verified profile and contact). A care provider&apos;s public profile shows their badges and reviews, never their ID documents.</Bullet>
              <Bullet><strong>With trusted service providers</strong> who help us run the platform, including Paystack (payments), and the providers that host our website, database, secure file storage, and send our emails. They may only use your data to provide their service to us, and must keep it confidential.</Bullet>
              <Bullet><strong>When the law requires it</strong> — for example, to comply with a lawful request from a court or authority, or to protect the safety of a person or a dog.</Bullet>
            </ul>
          </Section>

          <hr className="border-gray-100" />

          <Section num="7" title="Storing data outside Ghana">
            <p className="text-sm leading-relaxed text-gray-600">
              Some of the trusted providers that host our systems store data on servers located outside Ghana. Where this happens, we take steps to make sure your data is protected to a standard consistent with Ghana&apos;s Data Protection Act, 2012 (Act 843), and is only used for the purposes described in this policy.
            </p>
          </Section>

          <hr className="border-gray-100" />

          <Section num="8" title="How long we keep your data">
            <p className="mb-3 text-sm leading-relaxed text-gray-600">We keep your data only as long as we need it. As a guide:</p>
            <ul className="space-y-2">
              <Bullet><strong>While your account is active</strong> — we keep your account and profile data so you can use the service.</Bullet>
              <Bullet><strong>After you close your account</strong> — we delete or anonymise your account and profile data within about 12 months, unless we are required to keep it longer.</Bullet>
              <Bullet><strong>Booking, payment, and dispute records</strong> — we may keep these for up to 6 years to meet legal, tax, and accounting requirements and to resolve disputes.</Bullet>
              <Bullet><strong>care provider verification records</strong> — we keep these while you are an active care provider and for a period afterwards, for safety and to defend any legal claim.</Bullet>
            </ul>
          </Section>

          <hr className="border-gray-100" />

          <Section num="9" title="How we protect your data">
            <ul className="space-y-2">
              <Bullet>Information is encrypted while it travels between your device and our systems.</Bullet>
              <Bullet>Access to personal data is limited to people who need it to do their work, and they are bound to keep it confidential.</Bullet>
              <Bullet>care provider applications pass through an admin verification queue before going live.</Bullet>
              <Bullet>Payments are handled by Paystack, so we never hold your full payment details.</Bullet>
              <Bullet>We verify Ghana Cards against the national database rather than relying on photos alone.</Bullet>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              No system can be guaranteed perfectly secure, but we work to protect your data and to put it right quickly if something goes wrong.
            </p>
          </Section>

          <hr className="border-gray-100" />

          <Section num="10" title="Your rights">
            <p className="mb-3 text-sm leading-relaxed text-gray-600">Under Ghana&apos;s Data Protection Act, 2012 (Act 843), you have the right to:</p>
            <ul className="space-y-2">
              <Bullet><strong>Access</strong> the personal data we hold about you.</Bullet>
              <Bullet><strong>Correct</strong> data that is wrong or out of date.</Bullet>
              <Bullet><strong>Delete</strong> your data, where we are not required to keep it.</Bullet>
              <Bullet><strong>Object to or restrict</strong> certain uses of your data.</Bullet>
              <Bullet><strong>Withdraw consent</strong> at any time, where we relied on your consent.</Bullet>
              <Bullet><strong>Complain</strong> to the Data Protection Commission if you are unhappy with how we handle your data.</Bullet>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              To exercise any of these, email us at <a href="mailto:support@dogcaregh.com" className="font-semibold hover:underline" style={{ color: "#00b096" }}>support@dogcaregh.com</a>. We will respond within a reasonable time, and may need to confirm your identity first.
            </p>
          </Section>

          <hr className="border-gray-100" />

          <Section num="11" title="Children">
            <p className="text-sm leading-relaxed text-gray-600">
              DogCareGH is for adults aged 18 and over. We do not knowingly collect personal data from anyone under 18. If you believe a child has given us their data, contact us and we will remove it.
            </p>
          </Section>

          <hr className="border-gray-100" />

          <Section num="12" title="Cookies">
            <p className="text-sm leading-relaxed text-gray-600">
              We use cookies that are essential to the site — to keep you logged in, keep the site secure, and remember your preferences. You can control or delete cookies in your browser settings, though some parts of the site may not work properly without them.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 italic">
              If DogCareGH later uses analytics or advertising cookies (for example, Google Analytics), we will update this section and ask for your consent where required.
            </p>
          </Section>

          <hr className="border-gray-100" />

          <Section num="13" title="Changes to this policy">
            <p className="text-sm leading-relaxed text-gray-600">
              We may update this policy from time to time as our service grows or the law changes. When we do, we will post the new version here with an updated date. If a change is significant, we will let you know.
            </p>
          </Section>

          <hr className="border-gray-100" />

          <Section num="14" title="How to contact us">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-600">
              <p className="font-bold" style={{ color: "#0a2e30" }}>DogCareGH (operated by 888 Capital City Ventures)</p>
              <p className="mt-1">Email: <a href="mailto:support@dogcaregh.com" className="font-semibold hover:underline" style={{ color: "#00b096" }}>support@dogcaregh.com</a></p>
              <p>Phone: <a href="tel:0548667516" className="hover:underline" style={{ color: "#00b096" }}>054 866 7516</a></p>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-gray-600">
              If you wish to raise a concern with the regulator, you can contact the <strong>Data Protection Commission of Ghana</strong>:
            </p>
            <ul className="mt-2 space-y-1">
              <Bullet>Email: <a href="mailto:info@dataprotection.org.gh" className="font-semibold hover:underline" style={{ color: "#00b096" }}>info@dataprotection.org.gh</a></Bullet>
              <Bullet>Phone: +233 256 301 533</Bullet>
              <Bullet>Website: <a href="https://dataprotection.org.gh" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: "#00b096" }}>dataprotection.org.gh</a></Bullet>
            </ul>
          </Section>

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
