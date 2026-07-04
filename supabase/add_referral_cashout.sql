-- ============================================================
-- Referral balance cash-out
-- Run in Supabase Dashboard → SQL Editor (after add_referrals.sql)
--
-- Providers withdraw their referral_balance through the SAME
-- cashout_requests rail as normal earnings, tagged with a source
-- so the two pools stay accounted separately.
-- ============================================================

ALTER TABLE public.cashout_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'earnings'
    CHECK (source IN ('earnings', 'referral'));

CREATE INDEX IF NOT EXISTS idx_cashout_source ON public.cashout_requests (source);
