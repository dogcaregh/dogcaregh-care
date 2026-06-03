CREATE TABLE cashout_requests (
  id           uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id  uuid          NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  amount       numeric(10,2) NOT NULL CHECK (amount > 0),
  momo_network text          NOT NULL,
  momo_number  text          NOT NULL,
  status       text          NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'paid', 'rejected')),
  note         text,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  paid_at      timestamptz
);

CREATE INDEX idx_cashout_provider ON cashout_requests(provider_id);
CREATE INDEX idx_cashout_status   ON cashout_requests(status);

ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- Providers can view and create their own requests
CREATE POLICY "providers_select_cashouts" ON cashout_requests
  FOR SELECT USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "providers_insert_cashouts" ON cashout_requests
  FOR INSERT WITH CHECK (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

-- Admins can do everything
CREATE POLICY "admins_all_cashouts" ON cashout_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
