-- Add addon_ids to bookings so we can track which provider add-ons were selected.
-- Nullable UUID array — null means no add-ons were chosen.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS addon_ids uuid[];
