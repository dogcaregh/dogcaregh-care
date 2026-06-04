-- Cancellation policy fields on bookings.
-- cancelled_by       : who triggered the cancellation ('owner' | 'provider')
-- cancelled_at       : timestamp of cancellation
-- refund_amount      : amount to be refunded to owner via Paystack (0 if no payment taken)
-- penalty_amount     : 15% penalty amount where applicable
-- penalty_direction  : who pays the penalty ('owner_to_provider' | 'provider_to_owner' | null)
-- refund_policy      : which rule applied ('no_payment'|'full_refund'|'same_day'|'penalty_48h'|'mid_engagement')
-- refund_status      : admin processing state ('none' | 'pending' | 'processed')

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by       text,
  ADD COLUMN IF NOT EXISTS cancelled_at       timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount      numeric(10,2),
  ADD COLUMN IF NOT EXISTS penalty_amount     numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_direction  text,
  ADD COLUMN IF NOT EXISTS refund_policy      text,
  ADD COLUMN IF NOT EXISTS refund_status      text DEFAULT 'none';
