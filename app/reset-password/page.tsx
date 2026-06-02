"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });

    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 3000);
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
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(0,176,150,0.1)" }}>
                <svg className="h-7 w-7" style={{ color: "#00b096" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-extrabold" style={{ color: "#0a2e30" }}>Password updated!</h1>
              <p className="mt-2 text-sm text-gray-500">
                Your password has been changed. Redirecting you to sign in…
              </p>
              <Link
                href="/login"
                className="mt-4 block text-xs font-semibold hover:underline"
                style={{ color: "#00b096" }}
              >
                Go to sign in now
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
                  Set new password
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a strong password for your account.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={LABEL}>New Password</label>
                  <input
                    className={INPUT}
                    type="password"
                    placeholder="At least 8 characters"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className={LABEL}>Confirm Password</label>
                  <input
                    className={INPUT}
                    type="password"
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#00b096" }}
                >
                  {loading ? "Updating…" : "Update Password"}
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
