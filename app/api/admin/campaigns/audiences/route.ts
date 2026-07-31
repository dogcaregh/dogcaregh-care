import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { audienceCounts, weeklySuggestion, AUDIENCE_LABELS } from "@/lib/campaign-audiences";

export const dynamic = "force-dynamic";

// Sendable counts per audience + the weekly profile-completion suggestion box.
export async function GET() {
  const { ok, db } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [counts, suggestion] = await Promise.all([
      audienceCounts(db),
      weeklySuggestion(db, new Date()),
    ]);
    return NextResponse.json({ counts, labels: AUDIENCE_LABELS, suggestion });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
