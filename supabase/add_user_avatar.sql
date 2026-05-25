-- Add avatar_url to users table (for owner profile photos)
-- Run in Supabase Dashboard → SQL Editor

alter table users add column if not exists avatar_url text;

-- ── Storage bucket for owner photos ───────────────────────────────────────
-- Run these only once; skip if the bucket already exists.

insert into storage.buckets (id, name, public)
values ('owner-photos', 'owner-photos', true)
on conflict (id) do nothing;

-- Allow anyone to read (public bucket)
create policy "owner_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'owner-photos');

-- Owner can upload into their own folder  (path: <user_id>/filename)
create policy "owner_photos_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'owner-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can update (re-upload) their own folder
create policy "owner_photos_update"
  on storage.objects for update
  using (
    bucket_id = 'owner-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can delete their own files
create policy "owner_photos_delete"
  on storage.objects for delete
  using (
    bucket_id = 'owner-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
