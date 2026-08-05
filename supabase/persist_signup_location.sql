-- Persist owner (and provider) location at account-creation time.
--
-- Why: location was only ever written by the auth callback, which runs the
-- PKCE `?code=` confirmation flow. That flow is same-device only — it needs the
-- code-verifier cookie from the browser that started signup. When an owner
-- confirms on a different device / in an email app's in-app browser, the
-- exchange fails, the callback bails, and the location upsert never runs. The
-- account still works (they log in with their password later), but users.location
-- stays empty.
--
-- Fix: copy phone + location straight from the signup metadata in the
-- AFTER INSERT trigger on auth.users. This runs server-side in the DB the moment
-- the account is created — independent of device, PKCE, or the callback.
--
-- Run this whole file once in the Supabase SQL editor (production).

-- 1) Trigger: persist phone + location from signup metadata on account creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'neighbourhood', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill: recover existing owners whose location was lost but whose
--    neighbourhood is still sitting in their auth metadata. Only fills blanks —
--    never overwrites a location a user already has.
UPDATE public.users u
SET
  location = COALESCE(NULLIF(u.location, ''), NULLIF(au.raw_user_meta_data->>'neighbourhood', '')),
  phone    = COALESCE(NULLIF(u.phone, ''),    NULLIF(au.raw_user_meta_data->>'phone', ''))
FROM auth.users au
WHERE au.id = u.id
  AND (
    ((u.location IS NULL OR u.location = '') AND NULLIF(au.raw_user_meta_data->>'neighbourhood', '') IS NOT NULL)
    OR
    ((u.phone    IS NULL OR u.phone    = '') AND NULLIF(au.raw_user_meta_data->>'phone', '')        IS NOT NULL)
  );
