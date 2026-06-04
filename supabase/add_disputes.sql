-- ── disputes ──────────────────────────────────────────────────────────────────
-- Owners can raise a dispute against a booking while it is in_progress
-- or awaiting their confirmation (completed_pending).
-- Admin resolves via the /admin/disputes page using the service role.

create table public.disputes (
  id          uuid        primary key default uuid_generate_v4(),
  booking_id  uuid        not null references public.bookings(id) on delete cascade,
  raised_by   uuid        not null references public.users(id),
  reason      text        not null,
  description text,
  status      text        not null default 'open'
              check (status in ('open', 'under_review', 'resolved_no_action', 'resolved_refund', 'dismissed')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.disputes enable row level security;

-- Owner can raise a dispute
create policy "disputes: owner insert"
  on public.disputes for insert
  with check (raised_by = auth.uid());

-- Owner can read their own disputes
create policy "disputes: owner read own"
  on public.disputes for select
  using (raised_by = auth.uid());
