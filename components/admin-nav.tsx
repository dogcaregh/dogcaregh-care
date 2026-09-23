"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin",               label: "Overview"     },
  { href: "/admin/metrics",       label: "Metrics"      },
  { href: "/admin/transactions",  label: "Transactions" },
  { href: "/admin/users",         label: "Users"        },
  { href: "/admin/providers",     label: "Providers"    },
  { href: "/admin/email",         label: "Email"        },
  { href: "/admin/bookings",      label: "Bookings"     },
  { href: "/admin/reviews",       label: "Reviews"      },
  { href: "/admin/cashouts",      label: "Cashouts"     },
  { href: "/admin/referrals",     label: "Referrals"    },
  { href: "/admin/refunds",       label: "Refunds"      },
  { href: "/admin/disputes",      label: "Disputes"     },
  { href: "/admin/verification",  label: "Applicants"   },
];

export function AdminNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [alerts, setAlerts] = useState<{ pendingApplications: number; openDisputes: number } | null>(null);
  const [open,   setOpen]   = useState(false);

  useEffect(() => {
    fetch("/api/admin/alerts")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setAlerts(data); });
  }, [pathname]);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  function badge(href: string) {
    if (href === "/admin/verification") return alerts?.pendingApplications ?? 0;
    if (href === "/admin/disputes")     return alerts?.openDisputes        ?? 0;
    return 0;
  }

  const activePage = LINKS.find(l =>
    l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href)
  ) ?? LINKS[0];

  return (
    <nav className="sticky top-0 z-20 border-b border-white/10" style={{ backgroundColor: "#0a2e30" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-12 md:py-4">

        <div className="flex min-w-0 items-center gap-3 md:gap-6">
          <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-8 w-auto shrink-0 md:h-9" /></Link>
          <span className="hidden text-xs font-bold uppercase tracking-widest sm:block" style={{ color: "#00b096" }}>
            Admin
          </span>

          {/* Desktop links */}
          <div className="hidden flex-wrap gap-1 md:flex">
            {LINKS.map(l => {
              const active = pathname === l.href;
              const b = badge(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="relative rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={active
                    ? { backgroundColor: "rgba(0,176,150,.18)", color: "#00b096" }
                    : { color: "rgba(255,255,255,.55)" }
                  }
                >
                  {l.label}
                  {b > 0 && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                      style={{ backgroundColor: "#dc2626" }}
                    >
                      {b > 9 ? "9+" : b}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile: current page name */}
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <span className="truncate text-sm font-semibold" style={{ color: "#00b096" }}>
              {activePage.label}
            </span>
            {badge(activePage.href) > 0 && (
              <span
                className="flex h-4 shrink-0 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                style={{ backgroundColor: "#dc2626" }}
              >
                {badge(activePage.href) > 9 ? "9+" : badge(activePage.href)}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={signOut}
            className="hidden rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 md:block"
          >
            Sign Out
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-white/10 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-white/10 px-3 py-3 md:hidden" style={{ backgroundColor: "#061e20" }}>
          <div className="grid grid-cols-2 gap-1">
            {LINKS.map(l => {
              const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
              const b = badge(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
                  style={active
                    ? { backgroundColor: "rgba(0,176,150,.18)", color: "#00b096" }
                    : { color: "rgba(255,255,255,.6)" }
                  }
                >
                  {l.label}
                  {b > 0 && (
                    <span
                      className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                      style={{ backgroundColor: "#dc2626" }}
                    >
                      {b > 9 ? "9+" : b}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-2 border-t border-white/10 pt-2">
            <button
              onClick={signOut}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
