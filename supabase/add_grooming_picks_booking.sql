-- Persist itemised grooming selections on each booking.
-- Stores a snapshot: [{subId, name, size, rate}] at the time of booking,
-- so the provider always sees exactly what was requested even if the
-- provider later changes their service list.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS grooming_picks jsonb;
