"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ACCRA_AREAS } from "@/lib/geocode";

type Step = "form" | "email-sent" | "done";

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";

export default function ProviderRegisterPage() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setSubmittedEmail(email);
      setStep("email-sent");
      setLoading(false);
      return;
    }

    const uid = data.user!.id;

    await supabase
      .from("users")
      .upsert({ id: uid, email, name, phone, role: "provider", location: neighbourhood })
      .eq("id", uid);

    const { error: providerError } = await supabase.from("providers").insert({
      user_id: uid,
      neighbourhood,
      location: neighbourhood,
      active: true,
    });

    if (providerError) {
      setError(providerError.message);
      setLoading(false);
      return;
    }

    setStep("done");
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: "#0a2e30" }}>
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <svg style={{position:"absolute",width:150,top:"5%",right:"3%",opacity:0.055,color:"#00b096",transform:"rotate(18deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:110,bottom:"10%",left:"-10px",opacity:0.05,color:"white",transform:"rotate(-14deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:58,top:"40%",left:"7%",opacity:0.04,color:"#00b096",transform:"rotate(34deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:44,top:"10px",left:"18%",opacity:0.04,color:"white",transform:"rotate(-5deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:70,top:"22%",right:"10%",opacity:0.035,color:"white",transform:"rotate(12deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
      </div>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-8 w-auto" /></Link>
        <Link
          href="/register/owner"
          className="text-sm text-white/60 transition hover:text-white"
        >
          Register as Pet Owner →
        </Link>
      </nav>

      {/* Card */}
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-black/30">

          {/* ── Email sent ── */}
          {step === "email-sent" && (
            <div className="py-4 text-center">
              <div className="mb-4 text-5xl">📧</div>
              <h2 className="mb-2 text-xl font-bold" style={{ color: "#0a2e30" }}>
                Check your email
              </h2>
              <p className="text-sm text-gray-500">
                We sent a confirmation link to{" "}
                <strong className="text-gray-700">{submittedEmail}</strong>. Click
                it to activate your provider account.
              </p>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="py-4 text-center">
              <div className="mb-4 text-5xl">🎉</div>
              <h2 className="mb-2 text-xl font-bold" style={{ color: "#0a2e30" }}>
                Account created!
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Your provider profile is ready. Next, add the services you offer
                and set your rates so pet owners can find you.
              </p>
              <Link
                href="/dashboard/provider/services"
                className="inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#00b096" }}
              >
                Set Up My Services →
              </Link>
            </div>
          )}

          {/* ── Form ── */}
          {step === "form" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
                  Become a Provider
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Join our network of trusted pet care professionals in Ghana.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={LABEL}>Full Name</label>
                  <input
                    className={INPUT}
                    type="text"
                    placeholder="Kofi Mensah"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL}>Email Address</label>
                  <input
                    className={INPUT}
                    type="email"
                    placeholder="kofi@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL}>Phone Number</label>
                  <input
                    className={INPUT}
                    type="tel"
                    placeholder="024 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL}>Password</label>
                  <input
                    className={INPUT}
                    type="password"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL}>Neighbourhood / Area</label>
                  <input
                    className={INPUT}
                    type="text"
                    placeholder="e.g. Osu"
                    list="accra-areas-p"
                    value={neighbourhood}
                    onChange={(e) => setNeighbourhood(e.target.value)}
                  />
                  <datalist id="accra-areas-p">
                    {ACCRA_AREAS.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#00b096" }}
                >
                  {loading ? "Creating account…" : "Create Provider Account"}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold hover:underline"
                  style={{ color: "#00b096" }}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
