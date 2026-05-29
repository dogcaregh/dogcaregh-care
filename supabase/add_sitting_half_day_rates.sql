-- Half-day rate columns for dog sitting on provider_services.
-- Existing rate_small/medium/large becomes the full-day (12 hr) rate for sitting.
ALTER TABLE public.provider_services
  ADD COLUMN IF NOT EXISTS rate_half_small  numeric(10,2) CHECK (rate_half_small  >= 0),
  ADD COLUMN IF NOT EXISTS rate_half_medium numeric(10,2) CHECK (rate_half_medium >= 0),
  ADD COLUMN IF NOT EXISTS rate_half_large  numeric(10,2) CHECK (rate_half_large  >= 0);

-- Sitting is now tiered, not hourly
UPDATE public.service_types SET rate_unit = 'per_session' WHERE slug = 'dog_sitting';
