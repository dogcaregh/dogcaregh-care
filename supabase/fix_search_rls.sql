-- Allows the /search page to read provider names without authentication.
-- The join providers -> users would otherwise return null for anon visitors
-- because the existing "own row select" policy blocks unauthenticated reads.
CREATE POLICY "users: public read for active providers"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.user_id = users.id
        AND providers.active = true
    )
  );
