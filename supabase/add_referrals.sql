-- ============================================================
-- Provider Referral System
-- Run in Supabase Dashboard → SQL Editor
--
-- Providers get a unique referral code + shareable link. Owners
-- who sign up via a code are permanently linked to that provider.
-- The provider then earns 5% of every paid booking the referred
-- owner makes, for 12 months from the owner's signup.
--
--   accrue  → owner's booking reaches 'paid'   (within 12mo window)
--   earn    → that booking reaches 'closed'    (credited to balance)
--   void    → that booking is 'cancelled'      (refund/no-show)
-- ============================================================


-- ── 1. Columns on providers ──────────────────────────────────

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS referral_code    text,
  ADD COLUMN IF NOT EXISTS referral_balance numeric(10,2) NOT NULL DEFAULT 0;


-- ── 2. Referral code generator ───────────────────────────────
-- 6 chars from an unambiguous alphabet (no O/0/I/1). Retries on
-- the (extremely unlikely) collision.

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code     text;
  i        int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    PERFORM 1 FROM public.providers WHERE referral_code = code;
    IF NOT FOUND THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;


-- ── 3. Auto-assign a code on provider creation ───────────────
-- Fires for BOTH provider-creation paths (client insert and the
-- server-role upsert) so neither has to know about referral codes.

CREATE OR REPLACE FUNCTION public.set_provider_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.gen_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provider_referral_code ON public.providers;

CREATE TRIGGER trg_provider_referral_code
  BEFORE INSERT ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.set_provider_referral_code();


-- ── 4. Backfill existing providers ───────────────────────────

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.providers WHERE referral_code IS NULL LOOP
    UPDATE public.providers
      SET referral_code = public.gen_referral_code()
      WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_referral_code
  ON public.providers (referral_code);


-- ── 5. Columns on users (the referee side) ───────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by_provider_id uuid REFERENCES public.providers(id),
  ADD COLUMN IF NOT EXISTS referred_by_code        text;


-- ── 6. referrals: durable referrer → referee link ────────────
-- One per referee, ever. expires_at caps the reward window at
-- 12 months from signup.

CREATE TABLE IF NOT EXISTS public.referrals (
  id                   uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_provider_id uuid        NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  referrer_user_id     uuid        NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  referee_user_id      uuid        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code        text        NOT NULL,
  expires_at           timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_no_self CHECK (referrer_user_id <> referee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_provider ON public.referrals (referrer_provider_id);


-- ── 7. referral_earnings: per-booking reward ledger ──────────
-- One row per qualifying paid booking (UNIQUE booking_id keeps
-- accrual idempotent against verify + webhook both firing).

CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id                   uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id          uuid          NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referrer_provider_id uuid          NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  referee_user_id      uuid          NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  booking_id           uuid          NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  gross_amount         numeric(10,2) NOT NULL,
  reward_amount        numeric(10,2) NOT NULL,
  status               text          NOT NULL DEFAULT 'accrued'
                                     CHECK (status IN ('accrued', 'earned', 'paid', 'void')),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  earned_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_earnings_provider ON public.referral_earnings (referrer_provider_id);
CREATE INDEX IF NOT EXISTS idx_earnings_referral ON public.referral_earnings (referral_id);


-- ── 8. RLS ───────────────────────────────────────────────────

ALTER TABLE public.referrals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- referrals: the referring provider can see their referrals
CREATE POLICY "referrals_provider_select" ON public.referrals
  FOR SELECT USING (
    referrer_provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

-- referrals: the referee can see (and create) their own link
CREATE POLICY "referrals_referee_select" ON public.referrals
  FOR SELECT USING (referee_user_id = auth.uid());

CREATE POLICY "referrals_referee_insert" ON public.referrals
  FOR INSERT WITH CHECK (referee_user_id = auth.uid());

CREATE POLICY "referrals_admin_all" ON public.referrals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- earnings: read-only for provider/admin; all writes happen via the
-- SECURITY DEFINER trigger below (which bypasses RLS).
CREATE POLICY "earnings_provider_select" ON public.referral_earnings
  FOR SELECT USING (
    referrer_provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "earnings_admin_all" ON public.referral_earnings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ── 9. Extend the booking-status trigger with reward logic ───
-- Adds accrue/earn/void to the existing notification trigger.
-- (Recreates handle_booking_status_change; keep in sync with
--  add_booking_states.sql if that file changes.)

CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id      uuid;
  v_provider_uid  uuid;
  v_provider_name text;
  v_owner_name    text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT b.owner_id, p.user_id
  INTO v_owner_id, v_provider_uid
  FROM public.bookings b
  JOIN public.providers p ON p.id = b.provider_id
  WHERE b.id = NEW.id;

  SELECT name INTO v_provider_name FROM public.users WHERE id = v_provider_uid;
  SELECT name INTO v_owner_name    FROM public.users WHERE id = v_owner_id;

  IF NEW.status = 'confirmed' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_owner_id, NEW.id, 'booking_confirmed',
      COALESCE(v_provider_name, 'Your provider') ||
      ' accepted your booking. Proceed with payment to confirm your spot.');

  ELSIF NEW.status = 'cancelled' THEN
    -- Determine who cancelled
    IF auth.uid() = v_provider_uid OR auth.uid() IS NULL THEN
      INSERT INTO public.notifications (user_id, booking_id, type, message)
      VALUES (v_owner_id, NEW.id, 'booking_declined',
        COALESCE(v_provider_name, 'The provider') ||
        ' is unable to accept your booking request.');
    ELSE
      INSERT INTO public.notifications (user_id, booking_id, type, message)
      VALUES (v_provider_uid, NEW.id, 'booking_cancelled',
        COALESCE(v_owner_name, 'The owner') ||
        ' cancelled their booking request.');
    END IF;

    -- Referral: void any not-yet-earned accrual for this booking
    UPDATE public.referral_earnings
       SET status = 'void'
     WHERE booking_id = NEW.id AND status = 'accrued';

  ELSIF NEW.status = 'paid' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_provider_uid, NEW.id, 'payment_received',
      COALESCE(v_owner_name, 'The owner') ||
      ' has completed payment. Get ready for the service!');

    -- Referral: accrue 5% of gross if the owner was referred and is
    -- still inside the 12-month window. Idempotent via UNIQUE(booking_id).
    INSERT INTO public.referral_earnings
      (referral_id, referrer_provider_id, referee_user_id, booking_id,
       gross_amount, reward_amount, status)
    SELECT r.id, r.referrer_provider_id, r.referee_user_id, NEW.id,
           NEW.gross_amount, round(NEW.gross_amount * 0.05, 2), 'accrued'
    FROM public.referrals r
    WHERE r.referee_user_id = v_owner_id
      AND now() < r.expires_at
    ON CONFLICT (booking_id) DO NOTHING;

  ELSIF NEW.status = 'in_progress' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_owner_id, NEW.id, 'service_started',
      COALESCE(v_provider_name, 'Your provider') ||
      ' has started the service.');

  ELSIF NEW.status = 'completed_pending' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_owner_id, NEW.id, 'awaiting_confirmation',
      COALESCE(v_provider_name, 'Your provider') ||
      ' marked the service as complete. Please confirm to release payment.');

  ELSIF NEW.status = 'closed' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_provider_uid, NEW.id, 'payout_triggered',
      'Booking confirmed by ' || COALESCE(v_owner_name, 'the owner') ||
      '. Your payout of GHS ' || NEW.provider_payout || ' has been triggered.');

    -- Referral: flip accrual → earned, credit the provider's referral
    -- balance, and notify — all keyed on the just-moved rows so a
    -- repeat 'closed' transition can never double-credit.
    WITH moved AS (
      UPDATE public.referral_earnings
         SET status = 'earned', earned_at = now()
       WHERE booking_id = NEW.id AND status = 'accrued'
       RETURNING referral_id, referrer_provider_id, reward_amount
    ), credited AS (
      UPDATE public.providers p
         SET referral_balance = p.referral_balance + moved.reward_amount
        FROM moved
       WHERE p.id = moved.referrer_provider_id
      RETURNING moved.reward_amount, moved.referral_id
    )
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    SELECT r.referrer_user_id, NEW.id, 'referral_reward',
           'You earned GHS ' || c.reward_amount ||
           ' in referral rewards from a completed booking!'
    FROM credited c
    JOIN public.referrals r ON r.id = c.referral_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the booking update
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_change ON public.bookings;

CREATE TRIGGER trg_booking_status_change
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change();
