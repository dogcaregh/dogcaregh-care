-- 1. Ensure additional_dog_ids column exists on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS additional_dog_ids uuid[];

-- 2. Replace narrow dog RLS with broader: provider can read all dogs of any
--    owner they have a booking with (fixes owner profile + booking extra dogs)
DROP POLICY IF EXISTS "dogs: providers read via bookings" ON public.dogs;

CREATE POLICY "dogs: providers read via bookings"
  ON public.dogs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.providers p ON p.id = b.provider_id
      WHERE b.owner_id = dogs.owner_id
        AND p.user_id = auth.uid()
    )
  );
