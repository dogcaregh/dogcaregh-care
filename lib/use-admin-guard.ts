"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAdminGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/admin/check");
      if (!res.ok) { router.replace("/"); return; }
      const { admin } = await res.json();
      if (!admin) { router.replace("/"); return; }
      setReady(true);
    }
    check();
  }, [router]);

  return ready;
}
