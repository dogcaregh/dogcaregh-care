"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function useAdminGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await sb.from("users").select("role").eq("id", user.id).single();
      if (!data || (data as { role: string }).role !== "admin") {
        router.replace("/");
        return;
      }
      setReady(true);
    }
    check();
  }, [router]);

  return ready;
}
