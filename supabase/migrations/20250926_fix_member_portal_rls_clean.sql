-- Fix RLS policies for member portal access

CREATE POLICY "Clients can view their own memberships" ON customer_memberships
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can view membership plans" ON membership_plans
  FOR SELECT
  USING (true);

CREATE POLICY "Clients can view their linked leads" ON leads
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    email IN (
      SELECT email FROM clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their own class credits" ON class_credits
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can view their own bookings" ON bookings
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can view their own class bookings" ON class_bookings
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role bypass for leads" ON leads
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass for class_credits" ON class_credits
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass for bookings" ON bookings
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass for class_bookings" ON class_bookings
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');