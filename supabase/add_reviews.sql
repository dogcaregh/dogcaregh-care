-- Drop the old placeholder reviews table and replace with
-- a unified bidirectional table (owner→provider and provider→owner).

DROP TABLE IF EXISTS public.reviews CASCADE;

CREATE TABLE public.reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES public.bookings(id)  ON DELETE CASCADE,
  from_user_id UUID        NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  to_user_id   UUID        NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  from_role    TEXT        NOT NULL CHECK (from_role IN ('owner', 'provider')),
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, from_role)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public profiles)
CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (true);

-- Users can only insert their own review
CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- Trigger: keep providers.rating_avg and providers.review_count in sync
-- whenever an owner submits a review for a provider.
CREATE OR REPLACE FUNCTION public.sync_provider_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.providers
  SET
    rating_avg   = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM   public.reviews
      WHERE  to_user_id = NEW.to_user_id
      AND    from_role  = 'owner'
    ),
    review_count = (
      SELECT COUNT(*)
      FROM   public.reviews
      WHERE  to_user_id = NEW.to_user_id
      AND    from_role  = 'owner'
    )
  WHERE user_id = NEW.to_user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_provider_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  WHEN (NEW.from_role = 'owner')
  EXECUTE FUNCTION public.sync_provider_rating();
