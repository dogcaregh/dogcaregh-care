-- Drop admin RLS policies that cause infinite recursion.
--
-- The circular dependency:
--   providers (admins_all_providers) → queries users
--   users (public read for providers) → queries providers
--   → infinite loop on any write that evaluates providers RLS
--
-- Admin access is handled exclusively by service-role API routes
-- (/api/admin/*) which bypass RLS entirely, so these policies are
-- not needed.

DROP POLICY IF EXISTS "admins_all_providers"  ON public.providers;
DROP POLICY IF EXISTS "admins_read_users"     ON public.users;
DROP POLICY IF EXISTS "admins_read_bookings"  ON public.bookings;
