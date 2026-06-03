-- Allow admins full access to providers (for verify/unverify)
CREATE POLICY "admins_all_providers" ON providers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to read all users
CREATE POLICY "admins_read_users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Allow admins to read all bookings
CREATE POLICY "admins_read_bookings" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
