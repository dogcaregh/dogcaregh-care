-- ============================================================
-- DogTrainerGH — Phase 2 Data Model (ADDITIVE, trainer-namespaced)
-- Shares the DogCareGH Supabase project. Nothing here drops, renames,
-- or alters an existing DogCareGH table, column, policy, or enum.
-- Every trainer table is prefixed `trainer_` to avoid colliding with the
-- live `bookings` / (potential) `sessions` names.
--
-- Run in Supabase Dashboard → SQL Editor AFTER owner approval.
-- Rollback: see supabase/rollback_trainer_schema.sql
-- ============================================================


-- ── 1. Additive flags on the existing users table ────────────
-- Brief §7 asks for these on `profiles`; the live identity table is `users`.
-- Nullable/defaulted → safe for every existing row and for the
-- handle_new_user() trigger (which inserts only id/name/email).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_owner   boolean NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_trainer boolean NOT NULL DEFAULT false;


-- ── 2. Trainer-side enums ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.trainer_eval_status AS ENUM ('requested','scheduled','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trainer_reco_status AS ENUM ('sent','accepted','declined','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mirrors the care-app escrow lifecycle (add_booking_states.sql) so the
-- trainer app can reuse the same status-machine + per-unit release pattern.
DO $$ BEGIN
  CREATE TYPE public.trainer_booking_status AS ENUM
    ('pending','confirmed','paid','in_progress','completed_pending','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trainer_session_status AS ENUM ('scheduled','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 3. trainer_profiles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trainer_profiles (
  id               uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid          NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  bio              text,
  specialties      text[]        NOT NULL DEFAULT '{}',
  breeds           text[]        NOT NULL DEFAULT '{}',
  neighbourhoods   text[]        NOT NULL DEFAULT '{}',
  methods          text,
  credentials      text,
  years_experience smallint      CHECK (years_experience >= 0),
  eval_fee         numeric(10,2) NOT NULL CHECK (eval_fee >= 300),   -- ₵300 floor, DB-enforced
  avatar_url       text,
  gallery_photos   text[]        NOT NULL DEFAULT '{}',
  vetting_status   text          NOT NULL DEFAULT 'pending'
                                 CHECK (vetting_status IN ('pending','verified','rejected')),
  active           boolean       NOT NULL DEFAULT true,
  created_at       timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_user   ON public.trainer_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_active ON public.trainer_profiles (active, vetting_status);


-- ── 4. trainer_owner_profiles (owner training-intake) ────────
-- NOT in the brief's table list, but both-sided matching (§5) needs a
-- persistent owner intent to "surface owners to trainers where they fit".
-- Optional/lazy: one row per owner, created on first questionnaire submit.
CREATE TABLE IF NOT EXISTS public.trainer_owner_profiles (
  id             uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid          NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  dog_id         uuid          REFERENCES public.dogs(id) ON DELETE SET NULL,
  goal           text,
  budget         numeric(10,2) CHECK (budget IS NULL OR budget >= 0),
  schedule       text,
  neighbourhood  text,
  created_at     timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_owner_profiles_user ON public.trainer_owner_profiles (user_id);


-- ── 5. trainer_programs (trainer-named standard + custom) ────
CREATE TABLE IF NOT EXISTS public.trainer_programs (
  id                uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id        uuid          NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  name              text          NOT NULL,                       -- trainer's own words
  description       text,
  weeks             int           NOT NULL CHECK (weeks > 0),
  sessions_per_week int           NOT NULL CHECK (sessions_per_week > 0),
  price             numeric(10,2)  NOT NULL CHECK (price >= 0),
  discount          numeric(10,2)  NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= price),
  is_custom         boolean       NOT NULL DEFAULT false,
  active            boolean       NOT NULL DEFAULT true,
  created_at        timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_programs_trainer ON public.trainer_programs (trainer_id, active);


-- ── 6. trainer_evaluations (paid, gates a new program) ───────
CREATE TABLE IF NOT EXISTS public.trainer_evaluations (
  id           uuid                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     uuid                  NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trainer_id   uuid                  NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  program_id   uuid                  REFERENCES public.trainer_programs(id) ON DELETE SET NULL,
  dog_id       uuid                  REFERENCES public.dogs(id) ON DELETE SET NULL,
  fee          numeric(10,2)         NOT NULL CHECK (fee >= 300),  -- ₵300 floor, DB-enforced
  status       trainer_eval_status   NOT NULL DEFAULT 'requested',
  scheduled_at timestamptz,
  payment_ref  text,
  created_at   timestamptz           NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_eval_owner   ON public.trainer_evaluations (owner_id);
CREATE INDEX IF NOT EXISTS idx_trainer_eval_trainer ON public.trainer_evaluations (trainer_id);


-- ── 7. trainer_recommendations (sent after evaluation) ───────
CREATE TABLE IF NOT EXISTS public.trainer_recommendations (
  id                uuid                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_id     uuid                  NOT NULL REFERENCES public.trainer_evaluations(id) ON DELETE CASCADE,
  owner_id          uuid                  NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trainer_id        uuid                  NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  is_custom         boolean               NOT NULL DEFAULT false,
  name              text,                                          -- program name for custom builds
  sessions_per_week int                   NOT NULL CHECK (sessions_per_week > 0),
  weeks             int                   NOT NULL CHECK (weeks > 0),
  price             numeric(10,2)         NOT NULL CHECK (price >= 0),
  discount          numeric(10,2)         NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= price),
  note              text,
  status            trainer_reco_status   NOT NULL DEFAULT 'sent',
  created_at        timestamptz           NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_reco_owner ON public.trainer_recommendations (owner_id);
CREATE INDEX IF NOT EXISTS idx_trainer_reco_eval  ON public.trainer_recommendations (evaluation_id);


-- ── 8. trainer_bookings (escrow; supports direct rebooking) ──
CREATE TABLE IF NOT EXISTS public.trainer_bookings (
  id                uuid                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          uuid                    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trainer_id        uuid                    NOT NULL REFERENCES public.trainer_profiles(id) ON DELETE CASCADE,
  program_id        uuid                    REFERENCES public.trainer_programs(id) ON DELETE SET NULL,
  recommendation_id uuid                    REFERENCES public.trainer_recommendations(id) ON DELETE SET NULL,
  dog_id            uuid                    REFERENCES public.dogs(id) ON DELETE SET NULL,
  status            trainer_booking_status  NOT NULL DEFAULT 'pending',
  sessions_total    int                     NOT NULL CHECK (sessions_total > 0),
  gross_amount      numeric(10,2)           NOT NULL,
  commission_amount numeric(10,2)           NOT NULL DEFAULT 0,
  trainer_payout    numeric(10,2)           NOT NULL DEFAULT 0,
  payment_ref       text,
  created_at        timestamptz             NOT NULL DEFAULT now(),
  -- Rebooking-without-evaluation OR first-time-from-recommendation: need a source.
  CONSTRAINT trainer_bookings_source_valid CHECK (program_id IS NOT NULL OR recommendation_id IS NOT NULL),
  CONSTRAINT trainer_bookings_amounts_valid CHECK (
    gross_amount >= 0 AND commission_amount >= 0 AND trainer_payout >= 0
    AND commission_amount + trainer_payout <= gross_amount
  )
);
CREATE INDEX IF NOT EXISTS idx_trainer_bookings_owner   ON public.trainer_bookings (owner_id);
CREATE INDEX IF NOT EXISTS idx_trainer_bookings_trainer ON public.trainer_bookings (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_bookings_status  ON public.trainer_bookings (status);


-- ── 9. trainer_sessions (drive per-session escrow release) ───
CREATE TABLE IF NOT EXISTS public.trainer_sessions (
  id             uuid                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id     uuid                    NOT NULL REFERENCES public.trainer_bookings(id) ON DELETE CASCADE,
  scheduled_at   timestamptz,
  status         trainer_session_status  NOT NULL DEFAULT 'scheduled',
  release_amount numeric(10,2)           NOT NULL DEFAULT 0 CHECK (release_amount >= 0),
  released_at    timestamptz,
  created_at     timestamptz             NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_sessions_booking ON public.trainer_sessions (booking_id, status);


-- ── 10. Row Level Security ───────────────────────────────────
ALTER TABLE public.trainer_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_owner_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_programs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_evaluations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_sessions        ENABLE ROW LEVEL SECURITY;

-- helper: is the current user the trainer that owns trainer_profile :tid ?
-- (inlined as EXISTS in each policy to avoid adding a function dependency)

-- trainer_profiles: public read for discovery; owner writes own row
DROP POLICY IF EXISTS "trainer_profiles: public read" ON public.trainer_profiles;
CREATE POLICY "trainer_profiles: public read"
  ON public.trainer_profiles FOR SELECT USING (active = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "trainer_profiles: own insert" ON public.trainer_profiles;
CREATE POLICY "trainer_profiles: own insert"
  ON public.trainer_profiles FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "trainer_profiles: own update" ON public.trainer_profiles;
CREATE POLICY "trainer_profiles: own update"
  ON public.trainer_profiles FOR UPDATE USING (user_id = auth.uid());

-- trainer_owner_profiles: private to the owner
DROP POLICY IF EXISTS "trainer_owner_profiles: own all" ON public.trainer_owner_profiles;
CREATE POLICY "trainer_owner_profiles: own all"
  ON public.trainer_owner_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trainers can read the intake of owners who have engaged them
DROP POLICY IF EXISTS "trainer_owner_profiles: engaged trainers read" ON public.trainer_owner_profiles;
CREATE POLICY "trainer_owner_profiles: engaged trainers read"
  ON public.trainer_owner_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trainer_evaluations e
    JOIN public.trainer_profiles tp ON tp.id = e.trainer_id
    WHERE e.owner_id = trainer_owner_profiles.user_id AND tp.user_id = auth.uid()
  ));

-- trainer_programs: public read for discovery; trainer writes own
DROP POLICY IF EXISTS "trainer_programs: public read" ON public.trainer_programs;
CREATE POLICY "trainer_programs: public read"
  ON public.trainer_programs FOR SELECT USING (
    active = true
    OR EXISTS (SELECT 1 FROM public.trainer_profiles tp
               WHERE tp.id = trainer_programs.trainer_id AND tp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainer_programs: trainer write" ON public.trainer_programs;
CREATE POLICY "trainer_programs: trainer write"
  ON public.trainer_programs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trainer_profiles tp
                 WHERE tp.id = trainer_programs.trainer_id AND tp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trainer_profiles tp
                      WHERE tp.id = trainer_programs.trainer_id AND tp.user_id = auth.uid()));

-- evaluations / recommendations / bookings / sessions:
-- readable & writable by the owner OR the trainer on the row.

DROP POLICY IF EXISTS "trainer_evaluations: owner or trainer" ON public.trainer_evaluations;
CREATE POLICY "trainer_evaluations: owner or trainer"
  ON public.trainer_evaluations FOR ALL
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_profiles tp
               WHERE tp.id = trainer_evaluations.trainer_id AND tp.user_id = auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_profiles tp
               WHERE tp.id = trainer_evaluations.trainer_id AND tp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainer_recommendations: owner or trainer" ON public.trainer_recommendations;
CREATE POLICY "trainer_recommendations: owner or trainer"
  ON public.trainer_recommendations FOR ALL
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_profiles tp
               WHERE tp.id = trainer_recommendations.trainer_id AND tp.user_id = auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_profiles tp
               WHERE tp.id = trainer_recommendations.trainer_id AND tp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainer_bookings: owner or trainer" ON public.trainer_bookings;
CREATE POLICY "trainer_bookings: owner or trainer"
  ON public.trainer_bookings FOR ALL
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_profiles tp
               WHERE tp.id = trainer_bookings.trainer_id AND tp.user_id = auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainer_profiles tp
               WHERE tp.id = trainer_bookings.trainer_id AND tp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainer_sessions: booking parties" ON public.trainer_sessions;
CREATE POLICY "trainer_sessions: booking parties"
  ON public.trainer_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.trainer_bookings b
    LEFT JOIN public.trainer_profiles tp ON tp.id = b.trainer_id
    WHERE b.id = trainer_sessions.booking_id
      AND (b.owner_id = auth.uid() OR tp.user_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trainer_bookings b
    LEFT JOIN public.trainer_profiles tp ON tp.id = b.trainer_id
    WHERE b.id = trainer_sessions.booking_id
      AND (b.owner_id = auth.uid() OR tp.user_id = auth.uid())
  ));


-- ── 11. Additive cross-visibility on users (names) ───────────
-- Mirrors the existing "users: public read for active providers" pattern.
-- Purely additive SELECT policies — existing users policies are untouched.

DROP POLICY IF EXISTS "users: public read for active trainers" ON public.users;
CREATE POLICY "users: public read for active trainers"
  ON public.users FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trainer_profiles tp
    WHERE tp.user_id = users.id AND tp.active = true
  ));

DROP POLICY IF EXISTS "users: trainers read their engaged owners" ON public.users;
CREATE POLICY "users: trainers read their engaged owners"
  ON public.users FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trainer_evaluations e
    JOIN public.trainer_profiles tp ON tp.id = e.trainer_id
    WHERE e.owner_id = users.id AND tp.user_id = auth.uid()
  ));
