"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type State = "verifying" | "success" | "failed";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state,     setState]     = useState<State>("verifying");
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get("reference") ?? searchParams.get("trxref");

    if (!reference) {
      setState("failed");
      return;
    }

    fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setBookingId(data.booking_id ?? null);
          setState("success");
          setTimeout(() => router.push(data.booking_id ? `/booking/${data.booking_id}` : "/dashboard/owner"), 3000);
        } else {
          setState("failed");
        }
      })
      .catch(() => setState("failed"));
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      {state === "verifying" && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00b096] border-t-transparent" />
          <p className="text-sm font-medium text-gray-600">Confirming your payment…</p>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Payment Successful!</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your booking is confirmed. Redirecting you to your booking…
            </p>
          </div>
          <Link
            href={bookingId ? `/booking/${bookingId}` : "/dashboard/owner"}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: "#00b096" }}
          >
            View Booking
          </Link>
        </div>
      )}

      {state === "failed" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Payment Failed</h1>
            <p className="mt-1 text-sm text-gray-500">
              Something went wrong with your payment. You have not been charged.
            </p>
          </div>
          <Link
            href="/dashboard/owner"
            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      )}
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00b096] border-t-transparent" />
            <p className="text-sm font-medium text-gray-600">Confirming your payment…</p>
          </div>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
