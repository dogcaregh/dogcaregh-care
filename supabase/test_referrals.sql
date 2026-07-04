-- ============================================================
-- Referral system — end-to-end test
-- Run in Supabase Dashboard → SQL Editor AFTER:
--   add_referrals.sql, add_referral_cashout.sql
--
-- Seeds throwaway data, drives real booking status transitions
-- (so the handle_booking_status_change trigger actually fires),
-- and asserts accrue / earn / void / window / idempotency / balance.
--
-- Self-cleaning: everything runs inside a transaction that is
-- ROLLED BACK at the end — no test rows persist.
--
-- PASS  → you'll see a series of "PASS: …" notices and no error.
-- FAIL  → the script aborts with a "FAIL: …" exception message.
-- ============================================================

BEGIN;

DO $$
DECLARE
  -- users
  prov_uid    uuid := gen_random_uuid();
  owner1_uid  uuid := gen_random_uuid();  -- referred, in-window
  owner2_uid  uuid := gen_random_uuid();  -- referred, window expired
  -- entities
  prov_id     uuid;
  dog1        uuid := gen_random_uuid();
  dog2        uuid := gen_random_uuid();
  -- bookings
  bkA         uuid := gen_random_uuid();  -- happy: accrue → earn (gross 200 → 10.00)
  bkB         uuid := gen_random_uuid();  -- void:  accrue → cancel (gross 80 → 4.00)
  bkC         uuid := gen_random_uuid();  -- recurring second earn (gross 100 → 5.00)
  bkD         uuid := gen_random_uuid();  -- expired window: no accrual (gross 200)
  -- scratch
  v_count     int;
  v_status    text;
  v_reward    numeric;
  v_earned_at timestamptz;
  v_balance   numeric;
  v_code      text;
BEGIN
  -- ── Seed users ────────────────────────────────────────────
  -- Bypass the FK to auth.users (and its trigger) just for these
  -- inserts; re-enable immediately so booking triggers still fire.
  SET session_replication_role = 'replica';
  INSERT INTO public.users (id, name, email, role) VALUES
    (prov_uid,   'REF-TEST Provider',  'ref-test-prov@dogcare.invalid',   'provider'),
    (owner1_uid, 'REF-TEST Owner One', 'ref-test-owner1@dogcare.invalid', 'owner'),
    (owner2_uid, 'REF-TEST Owner Two', 'ref-test-owner2@dogcare.invalid', 'owner');
  SET session_replication_role = 'origin';

  -- ── Provider (referral_code auto-assigned by trigger) ─────
  INSERT INTO public.providers (user_id, active, neighbourhood, location)
    VALUES (prov_uid, true, 'Osu', 'Osu')
    RETURNING id, referral_code INTO prov_id, v_code;

  IF v_code IS NULL OR length(v_code) <> 6 THEN
    RAISE EXCEPTION 'FAIL: provider referral_code not generated (got %)', v_code;
  END IF;
  RAISE NOTICE 'PASS: provider got referral_code %', v_code;

  -- ── Dogs ──────────────────────────────────────────────────
  INSERT INTO public.dogs (id, owner_id, name) VALUES
    (dog1, owner1_uid, 'REF-TEST Dog1'),
    (dog2, owner2_uid, 'REF-TEST Dog2');

  -- ── Referrals ─────────────────────────────────────────────
  -- owner1: in-window (default expires_at = now + 12 months)
  INSERT INTO public.referrals
    (referrer_provider_id, referrer_user_id, referee_user_id, referral_code)
    VALUES (prov_id, prov_uid, owner1_uid, v_code);
  -- owner2: window already expired
  INSERT INTO public.referrals
    (referrer_provider_id, referrer_user_id, referee_user_id, referral_code, expires_at)
    VALUES (prov_id, prov_uid, owner2_uid, v_code, now() - interval '1 day');

  -- ── Bookings (start as 'confirmed'; trigger fires on UPDATE) ─
  INSERT INTO public.bookings
    (id, owner_id, provider_id, dog_id, service_type, start_date, end_date,
     status, gross_amount, commission_amount, provider_payout) VALUES
    (bkA, owner1_uid, prov_id, dog1, 'dog_walking', current_date, current_date, 'confirmed', 200, 50, 150),
    (bkB, owner1_uid, prov_id, dog1, 'dog_walking', current_date, current_date, 'confirmed',  80, 20,  60),
    (bkC, owner1_uid, prov_id, dog1, 'dog_walking', current_date, current_date, 'confirmed', 100, 25,  75),
    (bkD, owner2_uid, prov_id, dog2, 'dog_walking', current_date, current_date, 'confirmed', 200, 50, 150);

  -- ══ TEST 1: accrue on paid ════════════════════════════════
  UPDATE public.bookings SET status = 'paid' WHERE id = bkA;

  SELECT count(*), max(reward_amount), max(status)
    INTO v_count, v_reward, v_status
    FROM public.referral_earnings WHERE booking_id = bkA;

  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL[1]: expected 1 accrual for bkA, got %', v_count; END IF;
  IF v_reward <> 10.00 THEN RAISE EXCEPTION 'FAIL[1]: expected reward 10.00, got %', v_reward; END IF;
  IF v_status <> 'accrued' THEN RAISE EXCEPTION 'FAIL[1]: expected status accrued, got %', v_status; END IF;
  RAISE NOTICE 'PASS[1]: paid → accrued 5%% (GHS %) ', v_reward;

  -- ══ TEST 2: accrual is idempotent (paid→confirmed→paid) ═══
  UPDATE public.bookings SET status = 'confirmed' WHERE id = bkA;
  UPDATE public.bookings SET status = 'paid'      WHERE id = bkA;

  SELECT count(*) INTO v_count FROM public.referral_earnings WHERE booking_id = bkA;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL[2]: re-paid duplicated accrual, got % rows', v_count; END IF;
  RAISE NOTICE 'PASS[2]: re-entering paid did not duplicate the accrual';

  -- ══ TEST 3: earn on closed + credit balance + notify ══════
  UPDATE public.bookings SET status = 'closed' WHERE id = bkA;

  SELECT status, earned_at INTO v_status, v_earned_at
    FROM public.referral_earnings WHERE booking_id = bkA;
  IF v_status <> 'earned' THEN RAISE EXCEPTION 'FAIL[3]: expected earned, got %', v_status; END IF;
  IF v_earned_at IS NULL THEN RAISE EXCEPTION 'FAIL[3]: earned_at not set'; END IF;

  SELECT referral_balance INTO v_balance FROM public.providers WHERE id = prov_id;
  IF v_balance <> 10.00 THEN RAISE EXCEPTION 'FAIL[3]: expected balance 10.00, got %', v_balance; END IF;

  SELECT count(*) INTO v_count
    FROM public.notifications WHERE booking_id = bkA AND type = 'referral_reward';
  IF v_count < 1 THEN RAISE EXCEPTION 'FAIL[3]: no referral_reward notification'; END IF;
  RAISE NOTICE 'PASS[3]: closed → earned, balance credited to GHS %, provider notified', v_balance;

  -- ══ TEST 4: recurring — a SECOND booking also earns ═══════
  UPDATE public.bookings SET status = 'paid'   WHERE id = bkC;
  UPDATE public.bookings SET status = 'closed' WHERE id = bkC;

  SELECT referral_balance INTO v_balance FROM public.providers WHERE id = prov_id;
  IF v_balance <> 15.00 THEN RAISE EXCEPTION 'FAIL[4]: expected balance 15.00 after 2nd booking, got %', v_balance; END IF;
  RAISE NOTICE 'PASS[4]: recurring reward — 2nd booking earned, balance now GHS %', v_balance;

  -- ══ TEST 5: void on cancel (accrued but not yet earned) ═══
  UPDATE public.bookings SET status = 'paid' WHERE id = bkB;
  SELECT status INTO v_status FROM public.referral_earnings WHERE booking_id = bkB;
  IF v_status <> 'accrued' THEN RAISE EXCEPTION 'FAIL[5]: bkB should be accrued, got %', v_status; END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = bkB;
  SELECT status INTO v_status FROM public.referral_earnings WHERE booking_id = bkB;
  IF v_status <> 'void' THEN RAISE EXCEPTION 'FAIL[5]: cancelled accrual should be void, got %', v_status; END IF;

  SELECT referral_balance INTO v_balance FROM public.providers WHERE id = prov_id;
  IF v_balance <> 15.00 THEN RAISE EXCEPTION 'FAIL[5]: cancel must not change balance, got %', v_balance; END IF;
  RAISE NOTICE 'PASS[5]: cancelled booking voided its accrual, balance unchanged (GHS %)', v_balance;

  -- ══ TEST 6: outside the 12-month window → no accrual ══════
  UPDATE public.bookings SET status = 'paid' WHERE id = bkD;
  SELECT count(*) INTO v_count FROM public.referral_earnings WHERE booking_id = bkD;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL[6]: expired-window booking accrued % rows', v_count; END IF;
  RAISE NOTICE 'PASS[6]: booking outside 12-month window did not accrue';

  -- ══ TEST 7: self-referral rejected by CHECK constraint ════
  BEGIN
    INSERT INTO public.referrals
      (referrer_provider_id, referrer_user_id, referee_user_id, referral_code)
      VALUES (prov_id, prov_uid, prov_uid, v_code);
    RAISE EXCEPTION 'FAIL[7]: self-referral was allowed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS[7]: self-referral rejected by referrals_no_self CHECK';
  END;

  RAISE NOTICE '─────────────────────────────────────────────';
  RAISE NOTICE 'ALL REFERRAL TESTS PASSED ✔  (rolling back test data)';
END $$;

ROLLBACK;
