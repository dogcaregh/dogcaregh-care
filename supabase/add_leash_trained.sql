-- Add leash_trained to dogs table
-- Run in Supabase Dashboard → SQL Editor

alter table dogs add column if not exists leash_trained boolean;
