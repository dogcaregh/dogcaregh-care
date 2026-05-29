"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });

    if (authErr) {
      setError(
        authErr.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : authErr.message
      );
      setLoading(false);
      return;
    }

    // Honour explicit redirect (e.g. from booking flow)
    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    // Route to the right dashboard based on role
    const { data: provRow } = await supabase
      .from("providers")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
      .maybeSingle();

    router.push(provRow ? "/dashboard/provider" : "/dashboard/owner");
    router.refresh();
  };

  return (
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
            <label className={LABEL} style={{ marginBottom: 0 }}>Password</label>
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
          <Link href="/register/owner" className="font-semibold hover:underline" style={{ color: "#00b096" }}>
            Create an owner account
          </Link>
        </p>
        <p>
          Want to offer services?{" "}
          <Link href="/register/provider" className="font-semibold hover:underline" style={{ color: "#00b096" }}>
            Register as a provider
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: "#0a2e30" }}>
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <svg style={{position:"absolute",width:155,top:"6%",right:"4%",opacity:0.055,color:"#00b096",transform:"rotate(20deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:115,bottom:"12%",left:"-12px",opacity:0.05,color:"white",transform:"rotate(-16deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:62,top:"44%",left:"8%",opacity:0.045,color:"#00b096",transform:"rotate(36deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:46,top:"12px",left:"20%",opacity:0.04,color:"white",transform:"rotate(-8deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:75,top:"28%",right:"12%",opacity:0.035,color:"white",transform:"rotate(8deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg className="hidden md:block" style={{position:"absolute",bottom:0,right:0,height:"60%",width:"auto",opacity:0.045,color:"white"}} viewBox="0 0 180 240" fill="currentColor">
          <circle cx="140" cy="28" r="18"/>
          <path d="M126 46 C121 76 119 102 117 118 L130 118 L134 88 L138 118 L152 118 C150 102 147 76 154 46 Z"/>
          <path d="M126 62 L96 76" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round"/>
          <rect x="119" y="118" width="14" height="50" rx="7"/>
          <rect x="137" y="118" width="14" height="50" rx="7"/>
          <path d="M96 76 Q72 84 50 80" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <ellipse cx="28" cy="98" rx="26" ry="17"/>
          <circle cx="54" cy="87" r="14"/>
          <ellipse cx="60" cy="76" rx="8" ry="13" transform="rotate(18 60 76)"/>
          <ellipse cx="66" cy="90" rx="9" ry="7"/>
          <circle cx="74" cy="88" r="3"/>
          <path d="M4 92 Q-10 72 5 60 Q14 52 18 63" stroke="currentColor" strokeWidth="9" fill="none" strokeLinecap="round"/>
          <rect x="44" y="112" width="9" height="20" rx="4"/>
          <rect x="33" y="114" width="9" height="18" rx="4"/>
          <rect x="14" y="112" width="9" height="20" rx="4"/>
          <rect x="3" y="114" width="9" height="18" rx="4"/>
        </svg>
      </div>
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-8 w-auto" /></Link>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Suspense fallback={
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl shadow-black/30">
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
