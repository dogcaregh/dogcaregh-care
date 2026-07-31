-- ============================================================
-- DogCareGH — Bulk Email Sender (marketing campaigns)
-- Run in Supabase SQL Editor.
--
-- Adds: marketing opt-out flag, campaign log + per-recipient log,
-- and a weekly profile-completion snapshot for the suggestion box.
-- All access is via the service role (admin API); RLS denies the
-- anon/auth roles by default and grants admins read access.
-- ============================================================

-- 1. Marketing opt-out. Transactional email (booking/payment) ignores this;
--    only the campaign sender filters on it.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_opt_out boolean NOT NULL DEFAULT false;

-- 2. One row per campaign send (incl. tests).
CREATE TABLE IF NOT EXISTS email_campaigns (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key    text        NOT NULL,
  subject         text        NOT NULL,
  audience_key    text        NOT NULL,
  audience_label  text        NOT NULL,
  recipient_count integer     NOT NULL DEFAULT 0,
  sent_count      integer     NOT NULL DEFAULT 0,
  failed_count    integer     NOT NULL DEFAULT 0,
  is_test         boolean     NOT NULL DEFAULT false,
  sent_by         uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON email_campaigns(created_at DESC);

-- 3. Who each campaign actually went to (the audit trail).
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid        NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES users(id) ON DELETE SET NULL,
  email       text        NOT NULL,
  first_name  text,
  status      text        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_user ON email_campaign_recipients(user_id);

-- 4. Weekly snapshot for the "who hasn't finished their profile" suggestion box.
--    Recomputed once per ISO week; people drop off as they complete their profile.
CREATE TABLE IF NOT EXISTS profile_completion_snapshots (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start  date        NOT NULL UNIQUE,
  cohorts     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profile_snapshots_week ON profile_completion_snapshots(week_start DESC);

-- RLS: service role bypasses; admins may read; nobody else sees these.
ALTER TABLE email_campaigns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_completion_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_campaigns" ON email_campaigns
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admins_read_campaign_recipients" ON email_campaign_recipients
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admins_read_profile_snapshots" ON profile_completion_snapshots
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
