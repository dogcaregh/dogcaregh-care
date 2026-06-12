-- Clear all bookings and related data. Users and dogs are untouched.
-- Run in Supabase Dashboard → SQL Editor
DELETE FROM notifications  WHERE booking_id IS NOT NULL;
DELETE FROM messages;
DELETE FROM transactions;
DELETE FROM cashout_requests;
DELETE FROM disputes;
DELETE FROM reviews;
DELETE FROM bookings;

-- Verify
SELECT 'bookings'     AS tbl, count(*) FROM bookings
UNION ALL SELECT 'messages',      count(*) FROM messages
UNION ALL SELECT 'transactions',  count(*) FROM transactions
UNION ALL SELECT 'disputes',      count(*) FROM disputes
UNION ALL SELECT 'reviews',       count(*) FROM reviews;
