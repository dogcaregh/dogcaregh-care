import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Terms of Service for DogCareGH, operated by 888 Capital City Ventures. Understand your rights and responsibilities as an owner or provider on our platform.",
};

export default function TermsPage() {
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
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Legal</p>
          <h1 className="text-3xl font-extrabold md:text-4xl" style={{ color: "#0a2e30" }}>Terms of Service</h1>
          <p className="mt-3 text-sm text-gray-500">Last updated: June 2025</p>
        </div>

        <div className="space-y-10 rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm md:px-10">

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>1. Introduction</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the DogCareGH platform and services operated by <strong>888 Capital City Ventures</strong> (&ldquo;DogCareGH&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By registering or using our platform, you agree to these Terms. If you do not agree, please do not use DogCareGH.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>2. What DogCareGH Is</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              DogCareGH is a <strong>marketplace platform</strong> that connects dog owners (&ldquo;Owners&rdquo;) with independent pet care providers (&ldquo;Providers&rdquo;). We do not employ Providers and are not a party to the service agreement between an Owner and a Provider. We facilitate bookings, payments, and communications between them.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>3. Accounts</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>You must be at least 18 years old to create an account.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>You are responsible for keeping your login credentials secure. Do not share your password.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>You must provide accurate, truthful information. Impersonation or false profiles will result in account termination.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>You may only have one account. Duplicate accounts may be removed.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>4. Bookings</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>An Owner submits a booking request to a Provider. The booking is not confirmed until the Provider accepts and the Owner completes payment.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Providers are not obligated to accept every request.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Once a booking is paid, it is binding on both parties subject to the cancellation policy.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>The Owner confirms service completion, which triggers the Provider&rsquo;s payout. Do not confirm completion if the service was not satisfactorily delivered — use the dispute process instead.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>5. Payments and Fees</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>All payments are processed securely through <strong>Paystack</strong> in Ghanaian Cedis (GHS).</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>DogCareGH charges a <strong>25% platform commission</strong> on every completed booking. The Provider receives the remaining 75% of the booking total.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Prices displayed are the total amount charged to the Owner. The Provider&rsquo;s payout is shown separately in their dashboard.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Providers may request a withdrawal of their available balance at any time via the earnings section of their dashboard. Withdrawals are sent via mobile money.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>DogCareGH processes withdrawal requests manually. We aim to process all requests within 2 business days.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>6. Cancellations and Refunds</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Cancellation policies are shown to the Owner before payment is made and must be accepted prior to booking.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Refunds, if applicable, are processed in accordance with the cancellation policy accepted at the time of booking.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Refunds are returned to the original payment method. Processing times depend on Paystack and the Owner&rsquo;s bank or mobile money provider.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>In cases of genuine emergencies, please contact support and we will review on a case-by-case basis.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>7. Provider Responsibilities</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Providers must provide services as described and agreed in the booking.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Providers are independent contractors, not employees of DogCareGH. You are responsible for your own taxes and compliance with Ghanaian law.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Providers must keep their profile, availability, and service information accurate and up to date.</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Providers are responsible for the safety and wellbeing of any dog in their care.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>8. Care Provider Verification</h2>
            <p className="mb-3 text-sm leading-relaxed text-gray-600">
              Because owners trust care providers with their dogs and sometimes their homes, care providers go through a verification process before becoming active on the platform. Verification requires:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                "Ghana Card identity check, verified against the national database, with a selfie to confirm the card belongs to you",
                "Phone number confirmation via one-time code",
                "Proof of address — utility bill, tenancy agreement, or a signed note from an assembly member or community elder",
                "Two character references (names and phone numbers of people we may contact)",
                "A passport photo for your public care provider profile",
                "For home services (daycare, sitting, overnight): photos and a short video of the space, and a rabies vaccination certificate for any dog sharing the space",
                "Optional: a Police Clearance Certificate to earn the Police-Cleared badge",
              ].map(item => (
                <li key={item} className="flex gap-2">
                  <span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Verification is not a guarantee of quality or safety — it indicates that a care provider has submitted documents we have reviewed. Owners should exercise their own judgement when choosing a care provider. Your verified badge is shown publicly; your underlying ID documents are never shared with other users.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>9. Disputes</h2>
            <p className="mb-3 text-sm leading-relaxed text-gray-600">
              If an Owner is not satisfied with a service, they may raise a dispute before confirming completion. DogCareGH will review the dispute and may:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Facilitate a resolution between the Owner and Provider</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Issue a partial or full refund at our discretion</span></li>
              <li className="flex gap-2"><span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span><span>Take action against the Provider if a policy violation is found</span></li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">Our decision on disputes is final.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>10. Prohibited Conduct</h2>
            <p className="mb-3 text-sm leading-relaxed text-gray-600">You must not:</p>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                "Use the platform for any unlawful purpose",
                "Arrange or solicit payments outside of the DogCareGH platform to avoid fees",
                "Post false, misleading, or defamatory reviews",
                "Harass, threaten, or abuse other users",
                "Attempt to gain unauthorised access to the platform or other accounts",
                "Use automated tools to scrape or misuse the platform",
              ].map(item => (
                <li key={item} className="flex gap-2">
                  <span style={{ color: "#00b096" }} className="mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-gray-600">Violations may result in immediate account suspension or termination.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>11. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              DogCareGH is a marketplace platform. We are not liable for the actions, omissions, or negligence of any Provider or Owner. To the maximum extent permitted by Ghanaian law, our total liability to you for any claim arising from your use of the platform is limited to the amount you paid to DogCareGH in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>12. Governing Law</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              These Terms are governed by the laws of the Republic of Ghana. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>13. Changes to These Terms</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              We may update these Terms from time to time. We will notify you of material changes by email or by displaying a prominent notice on the platform. Continued use of DogCareGH after updated Terms take effect constitutes your acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold" style={{ color: "#0a2e30" }}>14. Contact</h2>
            <p className="mb-3 text-sm leading-relaxed text-gray-600">Questions about these Terms? Contact us:</p>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-600">
              <p className="font-bold" style={{ color: "#0a2e30" }}>DogCareGH (operated by 888 Capital City Ventures)</p>
              <p className="mt-1">Email: <a href="mailto:support@dogcaregh.com" className="font-semibold hover:underline" style={{ color: "#00b096" }}>support@dogcaregh.com</a></p>
              <p>Phone: <a href="tel:0548667516" className="hover:underline" style={{ color: "#00b096" }}>054 866 7516</a></p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              For data privacy matters, see our <Link href="/privacy" className="font-semibold hover:underline" style={{ color: "#00b096" }}>Privacy Policy</Link> or contact the <strong>Data Protection Commission of Ghana</strong> at <a href="mailto:info@dataprotection.org.gh" className="font-semibold hover:underline" style={{ color: "#00b096" }}>info@dataprotection.org.gh</a>.
            </p>
          </section>

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
