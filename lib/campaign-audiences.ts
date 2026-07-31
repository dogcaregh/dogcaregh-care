// Resolves audience/segment keys to concrete recipients, and computes the
// weekly "who hasn't finished their profile" suggestion cohorts.
// Server-only: every function takes a service-role Supabase client.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignRecipient } from "./campaign-email";

const INACTIVE_DAYS = 60;

export type AudienceKey =
  | "all_owners" | "all_caregivers"
  | "seg_cg_unsubmitted" | "seg_cg_incomplete"
  | "seg_owner_no_dog" | "seg_owner_no_location" | "seg_owner_inactive"
  | "individuals";

export const AUDIENCE_LABELS: Record<AudienceKey, string> = {
  all_owners: "All owners",
  all_caregivers: "All caregivers",
  seg_cg_unsubmitted: "Caregivers — never submitted verification",
  seg_cg_incomplete: "Caregivers — profile/photos incomplete",
  seg_owner_no_dog: "Owners — no dog profile yet",
  seg_owner_no_location: "Owners — no location set",
  seg_owner_inactive: `Owners — no booking in ${INACTIVE_DAYS}+ days`,
  individuals: "Specific individuals",
};

type UserRow = { id: string; name: string | null; email: string | null; role: string; location: string | null; marketing_opt_out: boolean | null };
type ProvRow = { user_id: string; verification_status: string | null; bio: string | null; avatar_url: string | null };
type DogRow = { owner_id: string };
type BookRow = { owner_id: string; created_at: string };

type Loaded = { users: UserRow[]; providers: ProvRow[]; dogs: DogRow[]; bookings: BookRow[] };

async function load(db: SupabaseClient): Promise<Loaded> {
  const [u, p, d, b] = await Promise.all([
    db.from("users").select("id,name,email,role,location,marketing_opt_out"),
    db.from("providers").select("user_id,verification_status,bio,avatar_url"),
    db.from("dogs").select("owner_id"),
    db.from("bookings").select("owner_id,created_at"),
  ]);
  const firstErr = [u, p, d, b].find((r) => r.error);
  if (firstErr?.error) throw new Error(firstErr.error.message);
  return { users: (u.data ?? []) as UserRow[], providers: (p.data ?? []) as ProvRow[], dogs: (d.data ?? []) as DogRow[], bookings: (b.data ?? []) as BookRow[] };
}

const hasEmail = (u: UserRow) => !!(u.email && u.email.includes("@"));
const toRecipient = (u: UserRow): CampaignRecipient => ({ id: u.id, email: u.email as string, name: u.name });

// Which user ids belong to each segment (before opt-out / email filtering).
function segmentUserIds(data: Loaded): Record<Exclude<AudienceKey, "individuals">, Set<string>> {
  const { users, providers, dogs, bookings } = data;
  const owners = users.filter((u) => u.role === "owner");
  const caregivers = users.filter((u) => u.role === "provider");

  const dogOwnerIds = new Set(dogs.map((d) => d.owner_id));
  const provByUser = new Map(providers.map((p) => [p.user_id, p]));

  const lastBooking = new Map<string, number>();
  for (const b of bookings) {
    const t = new Date(b.created_at).getTime();
    if (!lastBooking.has(b.owner_id) || t > (lastBooking.get(b.owner_id) as number)) lastBooking.set(b.owner_id, t);
  }
  const cutoff = Date.now() - INACTIVE_DAYS * 864e5;

  const idsOf = (rows: UserRow[]) => new Set(rows.map((u) => u.id));

  return {
    all_owners: idsOf(owners),
    all_caregivers: idsOf(caregivers),
    seg_cg_unsubmitted: idsOf(caregivers.filter((u) => (provByUser.get(u.id)?.verification_status ?? "unsubmitted") === "unsubmitted")),
    seg_cg_incomplete: idsOf(caregivers.filter((u) => {
      const p = provByUser.get(u.id);
      if (!p || p.verification_status === "unsubmitted") return false; // covered by the verification reminder
      return !p.bio || !p.bio.trim() || !p.avatar_url;
    })),
    seg_owner_no_dog: idsOf(owners.filter((u) => !dogOwnerIds.has(u.id))),
    seg_owner_no_location: idsOf(owners.filter((u) => !u.location || !u.location.trim())),
    seg_owner_inactive: idsOf(owners.filter((u) => lastBooking.has(u.id) && (lastBooking.get(u.id) as number) < cutoff)),
  };
}

/** Resolve a campaign audience to sendable recipients (email present, opted-in). */
export async function resolveAudience(db: SupabaseClient, key: AudienceKey, userIds?: string[]): Promise<CampaignRecipient[]> {
  const data = await load(db);
  const optedOut = new Set(data.users.filter((u) => u.marketing_opt_out).map((u) => u.id));
  const byId = new Map(data.users.map((u) => [u.id, u]));

  let ids: Set<string>;
  if (key === "individuals") ids = new Set(userIds ?? []);
  else ids = segmentUserIds(data)[key];

  return Array.from(ids)
    .map((id) => byId.get(id))
    .filter((u): u is UserRow => !!u && hasEmail(u) && !optedOut.has(u.id))
    .map(toRecipient);
}

/** Sendable counts for every audience (drives the picker numbers). */
export async function audienceCounts(db: SupabaseClient): Promise<Record<string, number>> {
  const data = await load(db);
  const optedOut = new Set(data.users.filter((u) => u.marketing_opt_out).map((u) => u.id));
  const byId = new Map(data.users.map((u) => [u.id, u]));
  const segs = segmentUserIds(data);
  const sendable = (ids: Set<string>) => Array.from(ids).filter((id) => { const u = byId.get(id); return !!u && hasEmail(u) && !optedOut.has(u.id); }).length;
  const out: Record<string, number> = {};
  (Object.keys(segs) as (keyof typeof segs)[]).forEach((k) => { out[k] = sendable(segs[k]); });
  out.opted_out = optedOut.size;
  return out;
}

// ---- weekly suggestion cohorts ----
export type Cohort = { key: string; label: string; audienceKey: AudienceKey; templateKey: string; count: number };

const COHORT_DEFS: { key: string; label: string; audienceKey: Exclude<AudienceKey, "individuals">; templateKey: string }[] = [
  { key: "owner_no_dog", label: "Owners with no dog profile", audienceKey: "seg_owner_no_dog", templateKey: "o1" },
  { key: "owner_no_location", label: "Owners with no location set", audienceKey: "seg_owner_no_location", templateKey: "o11" },
  { key: "cg_unsubmitted", label: "Caregivers who never verified", audienceKey: "seg_cg_unsubmitted", templateKey: "c1" },
  { key: "cg_incomplete", label: "Caregivers missing profile/photos", audienceKey: "seg_cg_incomplete", templateKey: "c2" },
];

function computeCohorts(data: Loaded): Cohort[] {
  const optedOut = new Set(data.users.filter((u) => u.marketing_opt_out).map((u) => u.id));
  const byId = new Map(data.users.map((u) => [u.id, u]));
  const segs = segmentUserIds(data);
  const sendable = (ids: Set<string>) => Array.from(ids).filter((id) => { const u = byId.get(id); return !!u && hasEmail(u) && !optedOut.has(u.id); }).length;
  return COHORT_DEFS.map((c) => ({ ...c, count: sendable(segs[c.audienceKey]) }));
}

/** Monday (UTC) of the current week, as YYYY-MM-DD. */
export function currentWeekStart(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the suggestion cohorts for the current week. Snapshots once per ISO
 * week so the panel is stable within a week and recomputes (people drop off)
 * each new week. Sending always re-resolves live members, so anyone who
 * finished their profile mid-week is never emailed.
 */
export async function weeklySuggestion(db: SupabaseClient, now: Date): Promise<{ weekStart: string; cohorts: Cohort[]; fresh: boolean }> {
  const weekStart = currentWeekStart(now);
  const { data: existing } = await db.from("profile_completion_snapshots").select("cohorts").eq("week_start", weekStart).maybeSingle();
  if (existing?.cohorts) return { weekStart, cohorts: existing.cohorts as Cohort[], fresh: false };

  const cohorts = computeCohorts(await load(db));
  await db.from("profile_completion_snapshots").upsert({ week_start: weekStart, cohorts }, { onConflict: "week_start" });
  return { weekStart, cohorts, fresh: true };
}
