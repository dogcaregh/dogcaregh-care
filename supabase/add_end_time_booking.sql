-- Store booking end time explicitly so booking detail can display "09:00 – 11:00"
-- without having to recompute it from preferred_time + duration_hours.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS preferred_end_time time;
