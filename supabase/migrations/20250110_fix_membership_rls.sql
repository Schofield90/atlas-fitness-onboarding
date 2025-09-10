-- Add RLS policies for membership tables so clients can view their memberships

-- Enable RLS on customer_memberships if not already enabled
ALTER TABLE customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can view their memberships" ON customer_memberships;
DROP POLICY IF EXISTS "Clients can view membership by customer_id" ON customer_memberships;
DROP POLICY IF EXISTS "Clients can view membership plans" ON membership_plans;

-- Policy 1: Clients can view their own memberships (by client_id)
CREATE POLICY "Clients can view their memberships" ON customer_memberships
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Clients can also view memberships linked via customer_id (legacy)
CREATE POLICY "Clients can view membership by customer_id" ON customer_memberships
  FOR SELECT
  USING (
    customer_id IN (
      -- Get lead IDs that belong to this client
      SELECT l.id 
      FROM leads l 
      JOIN clients c ON (l.client_id = c.id OR l.email = c.email)
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy 3: Clients can view membership plans for their organization
CREATE POLICY "Clients can view membership plans" ON membership_plans
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM clients WHERE user_id = auth.uid()
    )
    OR id IN (
      SELECT membership_plan_id FROM customer_memberships
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
    OR id IN (
      SELECT cm.membership_plan_id 
      FROM customer_memberships cm
      JOIN leads l ON cm.customer_id = l.id
      JOIN clients c ON (l.client_id = c.id OR l.email = c.email)
      WHERE c.user_id = auth.uid()
    )
  );

-- Also ensure clients can see class_credits
ALTER TABLE class_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their credits" ON class_credits;
DROP POLICY IF EXISTS "Clients can view credits by customer_id" ON class_credits;

-- Policy for class_credits by client_id
CREATE POLICY "Clients can view their credits" ON class_credits
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Policy for class_credits by customer_id
CREATE POLICY "Clients can view credits by customer_id" ON class_credits
  FOR SELECT
  USING (
    customer_id IN (
      SELECT l.id 
      FROM leads l 
      JOIN clients c ON (l.client_id = c.id OR l.email = c.email)
      WHERE c.user_id = auth.uid()
    )
  );