-- Run this in Supabase Dashboard → SQL Editor
ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS avatar_url      TEXT,
  ADD COLUMN IF NOT EXISTS temperament     TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergies       TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diet_preference TEXT,
  ADD COLUMN IF NOT EXISTS neutered        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bio             TEXT;
