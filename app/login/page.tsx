"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : error.message
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#0a2e30" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="text-2xl font-bold tracking-tight text-white">
          Dog<span style={{ color: "#00b096" }}>Care</span>GH
        </Link>
      </nav>

      {/* Card */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-black/30">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to your DogCareGH account.
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

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={LABEL} style={{ marginBottom: 0 }}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium transition hover:underline"
                  style={{ color: "#00b096" }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                className={INPUT}
                type="password"
                placeholder="Your password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#00b096" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 space-y-2 border-t border-gray-100 pt-5 text-center text-xs text-gray-400">
            <p>
              New pet owner?{" "}
              <Link
                href="/register/owner"
                className="font-semibold hover:underline"
                style={{ color: "#00b096" }}
              >
                Create an owner account
              </Link>
            </p>
            <p>
              Want to offer services?{" "}
              <Link
                href="/register/provider"
                className="font-semibold hover:underline"
                style={{ color: "#00b096" }}
              >
                Register as a provider
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
