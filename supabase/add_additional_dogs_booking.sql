-- Support multiple dogs per booking.
-- primary dog_id stays; extra dogs go in this nullable array.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS additional_dog_ids uuid[];
