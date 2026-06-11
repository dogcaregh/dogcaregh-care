-- Fix temperament and allergies columns: cast text → text[]
-- These were originally created as TEXT from schema.sql, so the later
-- ADD COLUMN IF NOT EXISTS TEXT[] migration was silently skipped.

ALTER TABLE dogs
  ALTER COLUMN temperament TYPE text[]
    USING CASE
      WHEN temperament IS NULL OR temperament = '' THEN '{}'::text[]
      WHEN temperament LIKE '{%}' THEN temperament::text[]
      ELSE string_to_array(temperament, ',')
    END,
  ALTER COLUMN allergies TYPE text[]
    USING CASE
      WHEN allergies IS NULL OR allergies = '' THEN '{}'::text[]
      WHEN allergies LIKE '{%}' THEN allergies::text[]
      ELSE string_to_array(allergies, ',')
    END;
