"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { AdminNav } from "@/components/admin-nav";
import { StarRating } from "@/components/star-rating";

type Review = {
  id: string;
  rating: number;
  body: string | null;
  from_role: string;
  created_at: string;
  from_user: { name: string } | null;
  to_user: { name: string } | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type FilterKey = "all" | "owner" | "provider";

export default function AdminReviewsPage() {
  const ready = useAdminGuard();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterKey>("all");

  useEffect(() => {
    if (!ready) return;
    fetch("/api/admin/reviews")
      .then(r => r.json())
      .then(({ reviews: data }) => {
        setReviews((data ?? []) as Review[]);
        setLoading(false);
      });
  }, [ready]);

  const visible = filter === "all" ? reviews : reviews.filter(r => r.from_role === filter);
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const counts = {
    all:      reviews.length,
    owner:    reviews.filter(r => r.from_role === "owner").length,
    provider: reviews.filter(r => r.from_role === "provider").length,
  };

  const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#2563eb","#0284c7","#ec4899"];
  const bg  = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];
  const ini = (name?: string | null) => name ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";

  if (!ready || loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>
      <AdminNav />

      <div className="px-6 pb-8 pt-7 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00b096" }}>Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Reviews</h1>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <StarRating value={avgRating} size="md" />
            <span className="text-xl font-extrabold text-white">{avgRating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-white/50">{reviews.length} total review{reviews.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 space-y-5">

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {(["all", "owner", "provider"] as FilterKey[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold capitalize transition"
              style={filter === f ? { backgroundColor: "#0a2e30", color: "#fff" } : { color: "#9ca3af" }}
            >
              {f === "owner" ? "By Owners" : f === "provider" ? "By Providers" : "All"}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={filter === f
                  ? { backgroundColor: "rgba(255,255,255,.18)", color: "#fff" }
                  : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                }
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Reviews list */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
              <span className="mb-3 text-4xl">⭐</span>
              <p className="text-sm text-gray-400">No reviews found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {visible.map(r => {
                const fromName = (r.from_user as { name: string } | null)?.name ?? "Unknown";
                const toName   = (r.to_user   as { name: string } | null)?.name ?? "Unknown";
                return (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: bg(r.id) }}
                      >
                        {ini(fromName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "#0a2e30" }}>
                              {fromName}
                              <span className="ml-1.5 text-xs font-normal text-gray-400">→ {toName}</span>
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <StarRating value={r.rating} />
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                                style={r.from_role === "owner"
                                  ? { backgroundColor: "rgba(0,176,150,.1)", color: "#00b096" }
                                  : { backgroundColor: "rgba(37,99,235,.1)", color: "#2563eb" }
                                }
                              >
                                {r.from_role}
                              </span>
                            </div>
                          </div>
                          <p className="shrink-0 text-xs text-gray-400">{fmtDate(r.created_at)}</p>
                        </div>
                        {r.body && (
                          <p className="mt-2 text-sm leading-relaxed text-gray-600">{r.body}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
