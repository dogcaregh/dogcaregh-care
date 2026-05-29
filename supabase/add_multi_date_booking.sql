-- Add selected_dates column for multi-date bookings (walking, sitting, grooming).
-- Nullable so existing single-date and range bookings are unaffected.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS selected_dates date[];
