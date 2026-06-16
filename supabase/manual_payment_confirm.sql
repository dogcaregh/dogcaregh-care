-- ============================================================
-- Manual Payment Confirmation
-- Booking Reference: #402EF208 (Paystack transaction ref)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Step 1: Find the booking ──────────────────────────────────
-- Since the callback timed out, payment_ref may not be set yet.
-- Check by payment_ref first, then fall back to recent confirmed bookings.

SELECT
  b.id              AS booking_id,
  u.name            AS owner_name,
  u.email           AS owner_email,
  b.service_type,
  b.start_date,
  b.gross_amount,
  b.status,
  b.payment_ref,
  b.created_at
FROM bookings b
JOIN users u ON u.id = b.owner_id
WHERE
  b.payment_ref ILIKE '%402EF208%'
  OR b.status = 'confirmed'
ORDER BY b.created_at DESC
LIMIT 20;


-- ── Step 2: Once you have confirmed the correct booking_id ────
-- Replace <BOOKING_ID_HERE> with the UUID from the results above,
-- and replace <PAYSTACK_REF> with the full Paystack reference
-- (e.g. dogcare_..._... or 402EF208 as shown in your dashboard).

/*
UPDATE bookings
SET
  status      = 'paid',
  payment_ref = '402EF208'
WHERE id = '<BOOKING_ID_HERE>'
  AND status  = 'confirmed';
*/


-- ── Step 3: Verify the update worked ─────────────────────────
/*
SELECT id, status, payment_ref, gross_amount
FROM bookings
WHERE id = '<BOOKING_ID_HERE>';
*/


-- ── Step 4: Insert notifications (optional but recommended) ──
-- Notifies the provider and owner so they see the update in-app.
/*
DO $$
DECLARE
  v_booking_id  uuid := '<BOOKING_ID_HERE>';
  v_owner_id    uuid;
  v_provider_uid uuid;
  v_owner_name  text;
BEGIN
  SELECT b.owner_id, p.user_id
  INTO v_owner_id, v_provider_uid
  FROM bookings b
  JOIN providers p ON p.id = b.provider_id
  WHERE b.id = v_booking_id;

  SELECT name INTO v_owner_name FROM users WHERE id = v_owner_id;

  INSERT INTO notifications (user_id, booking_id, type, message)
  VALUES
    (v_provider_uid, v_booking_id, 'payment_received',
      COALESCE(v_owner_name, 'The owner') || ' has completed payment. Get ready for the service!'),
    (v_owner_id, v_booking_id, 'payment_confirmed',
      'Your payment was successful! Your booking is now confirmed.');
END $$;
*/
