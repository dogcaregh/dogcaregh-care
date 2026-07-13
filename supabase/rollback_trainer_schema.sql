-- ============================================================
-- Rollback for add_trainer_schema.sql
-- Drops ONLY the trainer-namespaced objects this migration created.
-- Touches no existing DogCareGH table, policy, or enum other than the
-- two additive users columns and the two additive users SELECT policies.
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================

-- Additive users SELECT policies (created by this migration only)
DROP POLICY IF EXISTS "users: public read for active trainers"   ON public.users;
DROP POLICY IF EXISTS "users: trainers read their engaged owners" ON public.users;

-- Trainer tables (CASCADE clears their policies, indexes, and FKs).
DROP TABLE IF EXISTS public.trainer_sessions        CASCADE;
DROP TABLE IF EXISTS public.trainer_bookings        CASCADE;
DROP TABLE IF EXISTS public.trainer_recommendations CASCADE;
DROP TABLE IF EXISTS public.trainer_evaluations     CASCADE;
DROP TABLE IF EXISTS public.trainer_programs        CASCADE;
DROP TABLE IF EXISTS public.trainer_owner_profiles  CASCADE;
DROP TABLE IF EXISTS public.trainer_profiles        CASCADE;

-- Trainer enums (safe once the tables above are gone).
DROP TYPE IF EXISTS public.trainer_session_status;
DROP TYPE IF EXISTS public.trainer_booking_status;
DROP TYPE IF EXISTS public.trainer_reco_status;
DROP TYPE IF EXISTS public.trainer_eval_status;

-- Additive users columns. Safe to drop because no DogCareGH code reads them.
-- (Leave these in place if the trainer app has already shipped and relies on them.)
ALTER TABLE public.users DROP COLUMN IF EXISTS is_trainer;
ALTER TABLE public.users DROP COLUMN IF EXISTS is_owner;
