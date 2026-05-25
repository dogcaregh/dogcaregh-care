-- ============================================================
-- Run in Supabase Dashboard → SQL Editor
-- Allows providers to read the names of owners who have booked them.
-- Without this, the users!owner_id join in the provider dashboard
-- returns null because no existing policy covers this read path.
-- ============================================================

CREATE POLICY "users: providers read their booking owners"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.providers p ON p.id = b.provider_id
      WHERE b.owner_id = users.id
        AND p.user_id = auth.uid()
    )
  );
