-- Fix RLS policies for member portal access
-- Clients need to be able to view their own data

-- ==============================================================================
-- CUSTOMER_MEMBERSHIPS table - Allow clients to view their own memberships
-- ==============================================================================

-- Add policy to allow clients to view their own memberships
CREATE POLICY "Clients can view their own memberships" ON customer_memberships
  FOR SELECT
  USING (
    -- Allow if the client_id matches the authenticated user's client record
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Also allow if customer_id matches a lead linked to this client
    customer_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- ==============================================================================
-- MEMBERSHIP_PLANS table - Allow clients to view membership plans (for display)
-- ==============================================================================

-- Add policy to allow clients to view membership plans
CREATE POLICY "Clients can view membership plans" ON membership_plans
  FOR SELECT
  USING (true); -- All clients can view all membership plans (for display purposes)

-- ==============================================================================
-- LEADS table - Allow clients to view leads linked to them
-- ==============================================================================

-- Add policy to allow clients to view their linked lead records
CREATE POLICY "Clients can view their linked leads" ON leads
  FOR SELECT
  USING (
    -- Allow if the lead is linked to this client
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Allow if the lead has the same email as the client
    email IN (
      SELECT email FROM clients WHERE user_id = auth.uid()
    )
  );

-- ==============================================================================
-- CLASS_CREDITS table - Allow clients to view their own credits
-- ==============================================================================

-- Add policy to allow clients to view their own class credits
CREATE POLICY "Clients can view their own class credits" ON class_credits
  FOR SELECT
  USING (
    -- Allow if the client_id matches the authenticated user's client record
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Also allow if customer_id matches a lead linked to this client
    customer_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- ==============================================================================
-- BOOKINGS table - Allow clients to view their own bookings
-- ==============================================================================

-- Add policy to allow clients to view their own bookings
CREATE POLICY "Clients can view their own bookings" ON bookings
  FOR SELECT
  USING (
    -- Allow if the client_id matches the authenticated user's client record
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Also allow if customer_id matches a lead linked to this client
    customer_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- ==============================================================================
-- CLASS_BOOKINGS table - Allow clients to view their own class bookings
-- ==============================================================================

-- Add policy to allow clients to view their own class bookings
CREATE POLICY "Clients can view their own class bookings" ON class_bookings
  FOR SELECT
  USING (
    -- Allow if the client_id matches the authenticated user's client record
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Also allow if customer_id matches a lead linked to this client
    customer_id IN (
      SELECT id FROM leads WHERE client_id IN (
        SELECT id FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- ==============================================================================
-- Add service role bypass for all tables (for admin functions)
-- ==============================================================================

-- Ensure service role can still do everything
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