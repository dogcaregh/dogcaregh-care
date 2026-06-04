-- Provider verification fields for Phase A.
-- verification_status: workflow state
-- provider_level:      1 = Carer (walking + grooming), 2 = Home Carer (all services)
-- verification_docs:   JSONB snapshot of submitted application data
-- verification_note:   admin's rejection reason (shown to provider)
-- verified_at:         timestamp when approved

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unsubmitted'
    CHECK (verification_status IN ('unsubmitted', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS provider_level      integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS verification_docs   jsonb,
  ADD COLUMN IF NOT EXISTS verification_note   text,
  ADD COLUMN IF NOT EXISTS verified_at         timestamptz;

-- Preserve providers already manually verified by admin
UPDATE public.providers
SET verification_status = 'approved',
    provider_level      = 2,
    verified_at         = now()
WHERE verified = true
  AND verification_status = 'unsubmitted';
