-- Rename "Dog Boarding" → "Dog Overnight" in the service_types table.
-- The slug 'dog_boarding' is unchanged (it's used by the enum and all records).
-- Only the display name is updated.

UPDATE public.service_types
SET name = 'Dog Overnight'
WHERE slug = 'dog_boarding';
