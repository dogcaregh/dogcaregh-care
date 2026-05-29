-- Update rate_unit to reflect the real billing basis per service.
UPDATE public.service_types SET rate_unit = 'per_hour'  WHERE slug = 'dog_walking';
UPDATE public.service_types SET rate_unit = 'per_hour'  WHERE slug = 'dog_sitting';
UPDATE public.service_types SET rate_unit = 'per_12hrs' WHERE slug = 'dog_daycare';
-- dog_boarding stays 'per_night', dog_grooming stays 'per_session'

-- Add time/duration columns to bookings (nullable, backward-compatible).
-- Only populated for walking and sitting bookings.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS preferred_time   time;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_hours   numeric(4,1);
