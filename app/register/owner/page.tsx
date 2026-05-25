"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const ACCRA_AREAS = [
  "Achimota", "Adenta", "Airport Residential", "Cantonments", "Dansoman",
  "Dome", "Dzorwulu", "East Legon", "Haatso", "Kasoa", "Kotobabi",
  "Labone", "Lapaz", "Legon", "Madina", "Nima", "North Kaneshie",
  "Osu", "Roman Ridge", "Sakumono", "Spintex", "Tema", "Tesano",
  "Teshie", "Trasacco Valley",
];

const SIZES = ["small", "medium", "large"] as const;
const TEMPERAMENTS = ["friendly", "selective", "nervous"] as const;

type Step = "account" | "dog" | "email-sent" | "done";

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
const LABEL = "block text-xs font-semibold text-gray-600 mb-1.5";

export default function OwnerRegisterPage() {
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");

  // Dog fields
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]>("medium");
  const [temperament, setTemperament] = useState<(typeof TEMPERAMENTS)[number]>("friendly");

  const handleAccountSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
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

    const { error: updateError } = await supabase
      .from("users")
      .upsert({ id: data.user!.id, email, name, phone, role: "owner", location: neighbourhood })
      .eq("id", data.user!.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setUserId(data.user!.id);
    setStep("dog");
    setLoading(false);
  };

  const handleDogSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.from("dogs").insert({
      owner_id: userId,
      name: dogName,
      breed: breed || null,
      age: age ? Number(age) : null,
      size,
      temperament,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setStep("done");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#0a2e30" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="text-2xl font-bold tracking-tight text-white">
          Dog<span style={{ color: "#00b096" }}>Care</span>GH
        </Link>
        <Link
          href="/register/provider"
          className="text-sm text-white/60 transition hover:text-white"
        >
          Register as Provider →
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
                it to activate your account.
              </p>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="py-4 text-center">
              <div className="mb-4 text-5xl">🎉</div>
              <h2 className="mb-2 text-xl font-bold" style={{ color: "#0a2e30" }}>
                You&apos;re all set!
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Your account and dog profile have been created. Welcome to
                DogCareGH!
              </p>
              <Link
                href="/"
                className="inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#00b096" }}
              >
                Browse Providers
              </Link>
            </div>
          )}

          {/* ── Step 1: Account ── */}
          {step === "account" && (
            <>
              {/* Progress */}
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#00b096" }}
                  >
                    1
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: "#00b096", opacity: 0.3 }} />
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-xs font-bold text-gray-300">
                    2
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
                  Create your account
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Find trusted care for your dog across Ghana.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div>
                  <label className={LABEL}>Full Name</label>
                  <input
                    className={INPUT}
                    type="text"
                    placeholder="Ama Owusu"
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
                    placeholder="ama@example.com"
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
                    placeholder="e.g. East Legon"
                    list="accra-areas"
                    value={neighbourhood}
                    onChange={(e) => setNeighbourhood(e.target.value)}
                  />
                  <datalist id="accra-areas">
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
                  {loading ? "Creating account…" : "Continue →"}
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

          {/* ── Step 2: Dog profile ── */}
          {step === "dog" && (
            <>
              {/* Progress */}
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#00b096" }}
                  >
                    ✓
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: "#00b096" }} />
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#00b096" }}
                  >
                    2
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold" style={{ color: "#0a2e30" }}>
                  Tell us about your dog
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  This helps providers give the very best care.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleDogSubmit} className="space-y-4">
                <div>
                  <label className={LABEL}>Dog&apos;s Name</label>
                  <input
                    className={INPUT}
                    type="text"
                    placeholder="Max"
                    required
                    value={dogName}
                    onChange={(e) => setDogName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL}>
                    Breed{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    className={INPUT}
                    type="text"
                    placeholder="e.g. Labrador, Mixed Breed"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL}>
                    Age in years{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    className={INPUT}
                    type="number"
                    placeholder="3"
                    min={0}
                    max={25}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>

                {/* Size */}
                <div>
                  <label className={LABEL}>Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className="rounded-xl border py-2.5 text-sm font-medium capitalize transition"
                        style={
                          size === s
                            ? { backgroundColor: "#00b096", borderColor: "#00b096", color: "white" }
                            : { borderColor: "#e5e7eb", color: "#374151" }
                        }
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperament */}
                <div>
                  <label className={LABEL}>Temperament</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPERAMENTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTemperament(t)}
                        className="rounded-xl border py-2.5 text-sm font-medium capitalize transition"
                        style={
                          temperament === t
                            ? { backgroundColor: "#00b096", borderColor: "#00b096", color: "white" }
                            : { borderColor: "#e5e7eb", color: "#374151" }
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#00b096" }}
                >
                  {loading ? "Saving…" : "Complete Setup 🐾"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
