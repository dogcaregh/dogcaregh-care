-- ============================================================
-- DogCareGH — Booking messages: storage bucket + realtime
-- Run each statement separately in Supabase SQL Editor
-- ============================================================

-- 1. Create the booking-updates storage bucket (public so photos
--    can be rendered in-thread without auth tokens in the URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-updates', 'booking-updates', true)
ON CONFLICT (id) DO NOTHING;


-- 2. Allow anyone to view photos in this bucket
--    (photos are scoped to booking IDs which are UUIDs, not guessable)
CREATE POLICY "booking-updates: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'booking-updates');


-- 3. Allow providers to upload photos for their own bookings.
--    Path structure: {bookingId}/{userId}/{timestamp}.{ext}
--    (storage.foldername(name))[1] extracts the first path segment = bookingId
CREATE POLICY "booking-updates: provider upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'booking-updates'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM   public.bookings  b
      JOIN   public.providers p ON p.id = b.provider_id
      WHERE  b.id::text = (storage.foldername(name))[1]
        AND  p.user_id = auth.uid()
    )
  );


-- 4. Enable Supabase Realtime for the messages table so that
--    new messages appear instantly without a page refresh.
--    (Safe to run even if already added — Supabase is idempotent here)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
