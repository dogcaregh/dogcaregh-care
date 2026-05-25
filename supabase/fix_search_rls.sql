-- Allows the /search page to read provider names without authentication.
-- The join providers -> users would otherwise return null for anon visitors
-- because the existing "own row select" policy blocks unauthenticated reads.
-- Drop old version if it exists, then recreate without the active=true restriction.
DROP POLICY IF EXISTS "users: public read for active providers" ON public.users;

CREATE POLICY "users: public read for providers"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.user_id = users.id
    )
  );
