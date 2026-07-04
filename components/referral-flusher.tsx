"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

// Best-effort referral capture for the email-confirmation signup path.
// When an owner arrives via ?ref= but has to confirm their email first,
// there is no session at signup time, so the owner page can't attach the
// referral. The code stays in localStorage; once the owner is authenticated
// on any page, this flushes it to the attach endpoint (which is idempotent
// and guards self-referral) and clears it.
export function ReferralFlusher() {
  useEffect(() => {
    const code = localStorage.getItem("dcg_ref");
    if (!code) return;

    let cancelled = false;
    (async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (cancelled || !user) return; // not logged in yet — retry on a later load
      try {
        await fetch("/api/referrals/attach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
      } catch {
        /* best-effort; leave the code for a future attempt */
        return;
      }
      localStorage.removeItem("dcg_ref");
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}
