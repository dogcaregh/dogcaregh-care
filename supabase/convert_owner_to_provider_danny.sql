-- Convert Danny Best (daniekajnr@gmail.com) from owner → provider
-- Run in Supabase SQL Editor

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'daniekajnr@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: daniekajnr@gmail.com';
  END IF;

  -- Update role
  UPDATE public.users
  SET role = 'provider'
  WHERE id = v_user_id;

  -- Create provider profile if one doesn't already exist
  INSERT INTO public.providers (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Done — user_id: %', v_user_id;
END;
$$;
