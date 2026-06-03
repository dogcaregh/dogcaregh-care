-- The reviews table was recreated by add_reviews.sql, renaming owner_id -> from_user_id.
-- The old "users: public read for reviewers" policy still referenced reviews.owner_id
-- which no longer exists, causing all anon-client joins on users to fail.
DROP POLICY IF EXISTS "users: public read for reviewers" ON public.users;

CREATE POLICY "users: public read for reviewers"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE reviews.from_user_id = users.id
    )
  );
