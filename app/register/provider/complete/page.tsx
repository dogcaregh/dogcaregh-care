"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ProviderCompletePage() {
  const router = useRouter();

  useEffect(() => {
    async function complete() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Use the service-role API route so RLS cannot block creating the provider rows.
      await fetch("/api/register/provider", { method: "POST" });

      router.push("/dashboard/provider/services");
    }
    complete();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <div className="text-center">
        <div className="mb-4 text-4xl">🐾</div>
        <p className="text-sm font-semibold text-white/70">Setting up your provider account…</p>
      </div>
    </div>
  );
}
