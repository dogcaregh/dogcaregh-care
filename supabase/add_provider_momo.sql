-- Add mobile money payout fields to providers
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS momo_network text,
  ADD COLUMN IF NOT EXISTS momo_number  text;
