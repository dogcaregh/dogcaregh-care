-- Snapshot add-on details (name, price) at booking time so the booking record
-- is self-contained even if the provider later edits or removes an add-on.
-- New bookings populate this; legacy bookings fall back to a live provider_addons lookup.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS addon_snapshot jsonb;
