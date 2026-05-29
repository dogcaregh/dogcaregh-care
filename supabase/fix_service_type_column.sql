-- ============================================================
-- Fix service_type column: convert from old enum to text
-- and align slug values with the service_types table.
--
-- Old enum values → new text values:
--   pet_sitting     → dog_sitting
--   doggy_daycare   → dog_daycare
--   mobile_grooming → dog_grooming
--   dog_boarding    → dog_boarding  (unchanged)
--   dog_walking     → dog_walking   (unchanged)
--
-- Also converts providers.services array from service_type[]
-- to text[] for consistency.
-- ============================================================


-- ── 1. bookings.service_type ─────────────────────────────────

ALTER TABLE public.bookings
  ALTER COLUMN service_type TYPE text
  USING service_type::text;

UPDATE public.bookings SET service_type = 'dog_sitting'  WHERE service_type = 'pet_sitting';
UPDATE public.bookings SET service_type = 'dog_daycare'  WHERE service_type = 'doggy_daycare';
UPDATE public.bookings SET service_type = 'dog_grooming' WHERE service_type = 'mobile_grooming';


-- ── 2. providers.services array ──────────────────────────────

ALTER TABLE public.providers
  ALTER COLUMN services TYPE text[]
  USING services::text[];

UPDATE public.providers
  SET services = ARRAY(
    SELECT CASE
      WHEN s = 'pet_sitting'     THEN 'dog_sitting'
      WHEN s = 'doggy_daycare'   THEN 'dog_daycare'
      WHEN s = 'mobile_grooming' THEN 'dog_grooming'
      ELSE s
    END
    FROM unnest(services) AS s
  )
  WHERE services && ARRAY['pet_sitting','doggy_daycare','mobile_grooming']::text[];


-- ── 3. Drop old enum (safe — no longer referenced) ───────────

DROP TYPE IF EXISTS public.service_type;
