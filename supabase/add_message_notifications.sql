-- Create a notification when a new chat message is received.
-- Debounced: only inserts if the recipient has no unread message
-- notification for this booking from the last 5 minutes, so active
-- conversations don't spam the bell.

CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id     uuid;
  v_provider_uid uuid;
  v_sender_name  text;
  v_recipient_id uuid;
BEGIN
  -- Resolve both parties from the booking
  SELECT b.owner_id, p.user_id
  INTO   v_owner_id, v_provider_uid
  FROM   public.bookings b
  JOIN   public.providers p ON p.id = b.provider_id
  WHERE  b.id = NEW.booking_id;

  SELECT name INTO v_sender_name FROM public.users WHERE id = NEW.sender_id;

  -- Recipient is whichever party did NOT send
  IF NEW.sender_id = v_owner_id THEN
    v_recipient_id := v_provider_uid;
  ELSE
    v_recipient_id := v_owner_id;
  END IF;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  -- Only notify if no unread message notification exists for this booking
  -- in the last 5 minutes (prevents spam during active conversations).
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE  user_id    = v_recipient_id
      AND  booking_id = NEW.booking_id
      AND  type       = 'new_message'
      AND  read       = false
      AND  created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    INSERT INTO public.notifications (user_id, booking_id, type, message)
    VALUES (
      v_recipient_id,
      NEW.booking_id,
      'new_message',
      COALESCE(split_part(v_sender_name, ' ', 1), 'Someone') || ' sent you a message'
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_message_notification ON public.messages;

CREATE TRIGGER trg_new_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();
