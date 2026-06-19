-- ============================================================
-- DogCareGH — Delete all users who signed up today (UTC = Ghana)
-- Run in: Supabase Dashboard → SQL Editor
-- Deletes app table rows AND auth.users accounts.
-- ============================================================

-- Preview first — confirm who will be removed
SELECT au.id, au.email, au.created_at, pu.role
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.created_at::date = CURRENT_DATE
ORDER BY au.created_at;

-- ── Delete app data in FK-safe order ────────────────────────

-- Notifications
DELETE FROM notifications
WHERE user_id IN (
  SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE
);

-- Messages
DELETE FROM messages
WHERE sender_id IN (
  SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE
);

-- Cashout requests (via providers)
DELETE FROM cashout_requests
WHERE provider_id IN (
  SELECT id FROM providers
  WHERE user_id IN (SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE)
);

-- Disputes
DELETE FROM disputes
WHERE booking_id IN (
  SELECT id FROM bookings
  WHERE owner_id IN (SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE)
     OR provider_id IN (
       SELECT id FROM providers
       WHERE user_id IN (SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE)
     )
);

-- Reviews
DELETE FROM reviews
WHERE from_user_id IN (
  SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE
)
OR to_user_id IN (
  SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE
);

-- Transactions
DELETE FROM transactions
WHERE booking_id IN (
  SELECT id FROM bookings
  WHERE owner_id IN (SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE)
     OR provider_id IN (
       SELECT id FROM providers
       WHERE user_id IN (SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE)
     )
);

-- Bookings
DELETE FROM bookings
WHERE owner_id IN (
  SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE
)
OR provider_id IN (
  SELECT id FROM providers
  WHERE user_id IN (SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE)
);

-- Dogs
DELETE FROM dogs
WHERE owner_id IN (
  SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE
);

-- Provider services
DELETE FROM provider_services
WHERE provider_id IN (
  SELECT id FROM providers
  WHERE user_id IN (SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE)
);

-- Providers
DELETE FROM providers
WHERE user_id IN (
  SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE
);

-- Public users
DELETE FROM public.users
WHERE id IN (
  SELECT id FROM auth.users WHERE created_at::date = CURRENT_DATE
);

-- Auth accounts (must be last)
DELETE FROM auth.users
WHERE created_at::date = CURRENT_DATE;

-- ── Verify ──────────────────────────────────────────────────
SELECT 'auth.users today' AS check, count(*)
FROM auth.users WHERE created_at::date = CURRENT_DATE
UNION ALL
SELECT 'public.users today', count(*)
FROM public.users WHERE created_at::date = CURRENT_DATE;
