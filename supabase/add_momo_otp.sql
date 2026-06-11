-- Add momo_verified column to providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS momo_verified boolean NOT NULL DEFAULT false;

-- OTP tracking table (service role only — no RLS policies = no public access)
CREATE TABLE IF NOT EXISTS momo_otps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text NOT NULL,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE momo_otps ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup when verifying
CREATE INDEX IF NOT EXISTS momo_otps_phone_idx ON momo_otps (phone, created_at DESC);
