import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "#0a2e30" }}
    >
      <div
        style={{ width: 148, height: 148, borderRadius: "50%", overflow: "hidden", marginBottom: 24, border: "3px solid rgba(0,176,150,0.4)" }}
        aria-hidden="true"
      >
        <img src="/dog-lost.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      <p className="mb-2 text-7xl font-extrabold text-white/10">404</p>
      <h1 className="mb-2 text-2xl font-extrabold text-white">Page not found</h1>
      <p className="mb-8 max-w-sm text-sm text-white/50">
        This page doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: "#00b096" }}
        >
          Go Home
        </Link>
        <Link
          href="/search"
          className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Find a Provider
        </Link>
      </div>

      <Link href="/" className="mt-10 block">
        <img src="/weblogo.png" alt="DogCareGH" className="h-9 w-auto opacity-60" />
      </Link>
    </div>
  );
}
