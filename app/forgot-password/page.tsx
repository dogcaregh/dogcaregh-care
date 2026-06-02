"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";

const PAW = (
  <svg viewBox="0 0 100 100" fill="currentColor">
    <ellipse cx="50" cy="63" rx="24" ry="20"/>
    <ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/>
    <ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/>
    <ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/>
    <ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/>
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (resetErr) {
      setError(resetErr.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: "#0a2e30" }}>
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <span style={{ position: "absolute", width: 155, top: "6%", right: "4%", opacity: 0.055, color: "#00b096", transform: "rotate(20deg)", display: "block" }}>{PAW}</span>
        <span style={{ position: "absolute", width: 115, bottom: "12%", left: "-12px", opacity: 0.05, color: "white", transform: "rotate(-16deg)", display: "block" }}>{PAW}</span>
        <span style={{ position: "absolute", width: 62, top: "44%", left: "8%", opacity: 0.045, color: "#00b096", transform: "rotate(36deg)", display: "block" }}>{PAW}</span>
        <span style={{ position: "absolute", width: 46, top: "12px", left: "20%", opacity: 0.04, color: "white", transform: "rotate(-8deg)", display: "block" }}>{PAW}</span>
        <span style={{ position: "absolute", width: 75, top: "28%", right: "12%", opacity: 0.035, color: "white", transform: "rotate(8deg)", display: "block" }}>{PAW}</span>
      </div>

      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-black/30">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#00b096/10", background: "rgba(0,176,150,0.1)" }}>
                <svg className="h-7 w-7" style={{ color: "#00b096" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-extrabold" style={{ color: "#0a2e30" }}>Check your email</h1>
              <p className="mt-2 text-sm text-gray-500">
                We sent a password reset link to <span className="font-semibold text-gray-700">{email}</span>.
                Check your inbox and click the link to continue.
              </p>
              <p className="mt-4 text-xs text-gray-400">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => { setSent(false); }}
                  className="font-semibold hover:underline"
                  style={{ color: "#00b096" }}
                >
                  try again
                </button>.
              </p>
              <Link
                href="/login"
                className="mt-6 block text-xs font-semibold hover:underline"
                style={{ color: "#00b096" }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
                  Forgot password?
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={LABEL}>Email Address</label>
                  <input
                    className={INPUT}
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#00b096" }}
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-100 pt-5 text-center text-xs text-gray-400">
                <Link href="/login" className="font-semibold hover:underline" style={{ color: "#00b096" }}>
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
