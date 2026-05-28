-- Allow providers to read their own profile row regardless of active status.
-- Without this, setting active=false made the providers row invisible to the
-- provider's own queries, breaking the profile page load and the toggle.
CREATE POLICY "providers: read own profile"
  ON public.providers FOR SELECT
  USING (auth.uid() = user_id);
