"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { lookupCoords } from "@/lib/geocode";

export default function ProviderCompletePage() {
  const router = useRouter();

  useEffect(() => {
    async function complete() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const meta = user.user_metadata as { name?: string; phone?: string; neighbourhood?: string };
      const name         = meta.name ?? "";
      const phone        = meta.phone ?? "";
      const neighbourhood = meta.neighbourhood ?? "";

      await supabase
        .from("users")
        .upsert({ id: user.id, email: user.email, name, phone, role: "provider", location: neighbourhood })
        .eq("id", user.id);

      const { data: existing } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        const coords = lookupCoords(neighbourhood.trim());
        await supabase.from("providers").insert({
          user_id:      user.id,
          neighbourhood,
          location:     neighbourhood,
          active:       true,
          lat:          coords?.lat ?? null,
          lng:          coords?.lng ?? null,
        });
      }

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
