-- Providers can mark specific dates as unavailable.
-- Stored as an array of dates on the providers row for simplicity.
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS blocked_dates date[] NOT NULL DEFAULT '{}';
