-- ============================================================
-- Booking Status Engine
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================


-- ── 1. Extend booking_status enum ────────────────────────────

ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'completed_pending';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'closed';


-- ── 2. Notifications table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  booking_id  uuid        REFERENCES public.bookings(id) ON DELETE CASCADE,
  type        text        NOT NULL,
  message     text        NOT NULL,
  read        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notif_bk   ON public.notifications (booking_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: own select"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: own update"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);


-- ── 3. RLS: providers can read names of their booking owners ──

DROP POLICY IF EXISTS "users: providers read their booking owners" ON public.users;

CREATE POLICY "users: providers read their booking owners"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.providers p ON p.id = b.provider_id
      WHERE b.owner_id = users.id
        AND p.user_id = auth.uid()
    )
  );


-- ── 4. Trigger: auto-notify on booking status change ─────────

CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id      uuid;
  v_provider_uid  uuid;
  v_provider_name text;
  v_owner_name    text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT b.owner_id, p.user_id
  INTO v_owner_id, v_provider_uid
  FROM public.bookings b
  JOIN public.providers p ON p.id = b.provider_id
  WHERE b.id = NEW.id;

  SELECT name INTO v_provider_name FROM public.users WHERE id = v_provider_uid;
  SELECT name INTO v_owner_name    FROM public.users WHERE id = v_owner_id;

  IF NEW.status = 'confirmed' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_owner_id, NEW.id, 'booking_confirmed',
      COALESCE(v_provider_name, 'Your provider') ||
      ' accepted your booking. Proceed with payment to confirm your spot.');

  ELSIF NEW.status = 'cancelled' THEN
    -- Determine who cancelled
    IF auth.uid() = v_provider_uid OR auth.uid() IS NULL THEN
      INSERT INTO public.notifications (user_id, booking_id, type, message)
      VALUES (v_owner_id, NEW.id, 'booking_declined',
        COALESCE(v_provider_name, 'The provider') ||
        ' is unable to accept your booking request.');
    ELSE
      INSERT INTO public.notifications (user_id, booking_id, type, message)
      VALUES (v_provider_uid, NEW.id, 'booking_cancelled',
        COALESCE(v_owner_name, 'The owner') ||
        ' cancelled their booking request.');
    END IF;

  ELSIF NEW.status = 'paid' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_provider_uid, NEW.id, 'payment_received',
      COALESCE(v_owner_name, 'The owner') ||
      ' has completed payment. Get ready for the service!');

  ELSIF NEW.status = 'in_progress' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_owner_id, NEW.id, 'service_started',
      COALESCE(v_provider_name, 'Your provider') ||
      ' has started the service.');

  ELSIF NEW.status = 'completed_pending' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_owner_id, NEW.id, 'awaiting_confirmation',
      COALESCE(v_provider_name, 'Your provider') ||
      ' marked the service as complete. Please confirm to release payment.');

  ELSIF NEW.status = 'closed' THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (v_provider_uid, NEW.id, 'payout_triggered',
      'Booking confirmed by ' || COALESCE(v_owner_name, 'the owner') ||
      '. Your payout of GHS ' || NEW.provider_payout || ' has been triggered.');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the booking update
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_change ON public.bookings;

CREATE TRIGGER trg_booking_status_change
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change();
