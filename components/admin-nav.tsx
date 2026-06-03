"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin",          label: "Overview"  },
  { href: "/admin/users",    label: "Users"     },
  { href: "/admin/bookings", label: "Bookings"  },
  { href: "/admin/cashouts", label: "Cashouts"  },
];

export function AdminNav() {
  const pathname = usePathname();
  const router   = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <nav
      className="sticky top-0 z-20 border-b border-white/10 px-6 py-4 md:px-12"
      style={{ backgroundColor: "#0a2e30" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-9 w-auto" /></Link>
          <span className="hidden text-xs font-bold uppercase tracking-widest sm:block" style={{ color: "#00b096" }}>
            Admin
          </span>
          <div className="flex gap-1">
            {LINKS.map(l => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={active
                    ? { backgroundColor: "rgba(0,176,150,.18)", color: "#00b096" }
                    : { color: "rgba(255,255,255,.55)" }
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          onClick={signOut}
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
