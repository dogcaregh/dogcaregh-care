import Link from "next/link";

export default function RegisterChoicePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4" style={{ backgroundColor: "#0a2e30" }}>
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <svg style={{position:"absolute",width:150,top:"5%",right:"3%",opacity:0.055,color:"#00b096",transform:"rotate(18deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
        <svg style={{position:"absolute",width:110,bottom:"10%",left:"-10px",opacity:0.05,color:"white",transform:"rotate(-14deg)"}} viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="63" rx="24" ry="20"/><ellipse cx="22" cy="38" rx="10" ry="13" transform="rotate(-12 22 38)"/><ellipse cx="40" cy="27" rx="10" ry="13" transform="rotate(-4 40 27)"/><ellipse cx="60" cy="27" rx="10" ry="13" transform="rotate(4 60 27)"/><ellipse cx="78" cy="38" rx="10" ry="13" transform="rotate(12 78 38)"/></svg>
      </div>

      <Link href="/" className="mb-10">
        <img src="/weblogo.png" alt="DogCareGH" className="h-14 w-auto" />
      </Link>

      <h1 className="mb-2 text-center text-2xl font-extrabold text-white">Create your account</h1>
      <p className="mb-8 text-center text-sm text-white/60">How will you be using DogCareGH?</p>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/register/owner"
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 text-center shadow-xl transition hover:scale-[1.02]"
        >
          <span className="text-4xl">🐾</span>
          <span className="text-base font-bold" style={{ color: "#0a2e30" }}>I&apos;m a Pet Owner</span>
          <span className="text-xs text-gray-500">Find trusted care for your dog</span>
        </Link>

        <Link
          href="/register/provider"
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 text-center shadow-xl transition hover:scale-[1.02]"
        >
          <span className="text-4xl">🦮</span>
          <span className="text-base font-bold" style={{ color: "#0a2e30" }}>I&apos;m a Provider</span>
          <span className="text-xs text-gray-500">Offer pet care services and earn</span>
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-white/40">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-white/70 hover:text-white">
          Sign in
        </Link>
      </p>
    </div>
  );
}
