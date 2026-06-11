-- ============================================================
-- DogCareGH — Clear test data before going live
-- Run in Supabase Dashboard → SQL Editor
-- Preserves the admin account. Does NOT touch auth.users —
-- delete non-admin auth accounts manually via
-- Supabase Dashboard → Authentication → Users.
-- ============================================================

-- Confirm which admin will be kept (sanity check)
SELECT id, name, email, role FROM public.users WHERE role = 'admin';

-- ── Clear in FK-safe order ──────────────────────────────────

-- Metrics / incidents (no user FKs)
TRUNCATE TABLE metric_snapshots;
DELETE FROM incidents;

-- Notifications
DELETE FROM notifications;

-- Chat messages
DELETE FROM messages;

-- Financial records
DELETE FROM transactions;
DELETE FROM cashout_requests;

-- Disputes
DELETE FROM disputes;

-- Reviews
DELETE FROM reviews;

-- Bookings (must come after messages, transactions, reviews, disputes)
DELETE FROM bookings;

-- Dogs
DELETE FROM dogs;

-- Providers (non-admin only — admin shouldn't have one, but just in case)
DELETE FROM providers
WHERE user_id NOT IN (SELECT id FROM public.users WHERE role = 'admin');

-- Users — delete everyone except admin
DELETE FROM public.users WHERE role != 'admin';

-- ── Verify ──────────────────────────────────────────────────
SELECT 'users'              AS tbl, count(*) FROM public.users
UNION ALL SELECT 'providers',        count(*) FROM providers
UNION ALL SELECT 'dogs',             count(*) FROM dogs
UNION ALL SELECT 'bookings',         count(*) FROM bookings
UNION ALL SELECT 'reviews',          count(*) FROM reviews
UNION ALL SELECT 'transactions',     count(*) FROM transactions
UNION ALL SELECT 'messages',         count(*) FROM messages
UNION ALL SELECT 'cashout_requests', count(*) FROM cashout_requests
UNION ALL SELECT 'disputes',         count(*) FROM disputes
UNION ALL SELECT 'notifications',    count(*) FROM notifications
UNION ALL SELECT 'incidents',        count(*) FROM incidents
UNION ALL SELECT 'metric_snapshots', count(*) FROM metric_snapshots;
