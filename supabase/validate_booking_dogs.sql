-- Trigger: reject bookings where dog_id or additional_dog_ids don't belong to the owner.
-- Fires BEFORE INSERT so the row is never written if the check fails.

CREATE OR REPLACE FUNCTION public.validate_booking_dogs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Primary dog must belong to the booking owner
  IF NOT EXISTS (
    SELECT 1 FROM public.dogs
    WHERE id = NEW.dog_id AND owner_id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'dog_id does not belong to the booking owner';
  END IF;

  -- Each additional dog must also belong to the booking owner
  IF NEW.additional_dog_ids IS NOT NULL AND array_length(NEW.additional_dog_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.additional_dog_ids) AS extra_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.dogs
        WHERE id = extra_id AND owner_id = NEW.owner_id
      )
    ) THEN
      RAISE EXCEPTION 'One or more additional_dog_ids do not belong to the booking owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_dogs ON public.bookings;

CREATE TRIGGER trg_validate_booking_dogs
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_dogs();
