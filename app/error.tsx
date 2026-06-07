"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "#0a2e30" }}
    >
      <svg
        style={{ width: 80, opacity: 0.15, color: "#00b096", marginBottom: 24 }}
        viewBox="0 0 100 100"
        fill="currentColor"
        aria-hidden="true"
      >
        <ellipse cx="50" cy="63" rx="24" ry="20" />
        <ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)" />
        <ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)" />
        <ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)" />
        <ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)" />
      </svg>

      <p className="mb-2 text-7xl font-extrabold text-white/10">500</p>
      <h1 className="mb-2 text-2xl font-extrabold text-white">Something went wrong</h1>
      <p className="mb-8 max-w-sm text-sm text-white/50">
        An unexpected error occurred. You can try again or head back home.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: "#00b096" }}
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Go Home
        </Link>
      </div>

      <Link href="/" className="mt-10 block">
        <img src="/weblogo.png" alt="DogCareGH" className="h-9 w-auto opacity-60" />
      </Link>
    </div>
  );
}
