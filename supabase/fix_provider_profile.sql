-- ============================================================
-- Run this in Supabase Dashboard → SQL Editor
-- Adds profile columns, reviewer RLS, and storage setup
-- ============================================================


-- ── 1. New columns on providers ──────────────────────────────

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS years_experience smallint CHECK (years_experience >= 0),
  ADD COLUMN IF NOT EXISTS avatar_url       text,
  ADD COLUMN IF NOT EXISTS gallery_photos   text[]  NOT NULL DEFAULT '{}';


-- ── 2. Allow public reads of reviewer names ──────────────────
-- The reviews table is already public-readable, but the users
-- join was blocked for anonymous visitors. This policy unlocks
-- name-only reads for users who have left at least one review.

CREATE POLICY "users: public read for reviewers"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE reviews.owner_id = users.id
    )
  );


-- ── 3. Storage bucket ────────────────────────────────────────
-- Creates the provider-photos bucket (public read).
-- If you prefer to create it in the dashboard instead, skip
-- this block and create it manually under Storage → New bucket.

INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-photos', 'provider-photos', true)
ON CONFLICT (id) DO NOTHING;


-- ── 4. Storage RLS policies ──────────────────────────────────

-- Anyone can view photos
CREATE POLICY "provider-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'provider-photos');

-- Providers can upload into their own folder  (<uid>/filename)
CREATE POLICY "provider-photos: provider upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Providers can update (replace) their own files
CREATE POLICY "provider-photos: provider update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'provider-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Providers can delete their own files
CREATE POLICY "provider-photos: provider delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'provider-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
