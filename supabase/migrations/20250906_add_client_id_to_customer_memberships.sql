-- Add client_id column to customer_memberships table to support both leads and clients
-- This allows memberships to be associated with either leads (customer_id) or clients (client_id)

-- Add the client_id column
ALTER TABLE customer_memberships 
ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add index for client_id
CREATE INDEX IF NOT EXISTS idx_customer_memberships_client_id ON customer_memberships(client_id);

-- Update the unique constraint to handle both customer_id and client_id
-- First drop the existing constraint
ALTER TABLE customer_memberships 
DROP CONSTRAINT IF EXISTS customer_memberships_customer_id_membership_plan_id_status_key;

-- Add check constraint to ensure exactly one of customer_id or client_id is set
ALTER TABLE customer_memberships 
ADD CONSTRAINT check_customer_or_client 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL)
);

-- Create partial unique indexes for both scenarios
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_memberships_customer_unique
ON customer_memberships(customer_id, membership_plan_id, status)
WHERE customer_id IS NOT NULL AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_memberships_client_unique  
ON customer_memberships(client_id, membership_plan_id, status)
WHERE client_id IS NOT NULL AND status = 'active';

-- Update RLS policies to handle both customer_id and client_id
DROP POLICY IF EXISTS "Users can view customer memberships from their organization" ON customer_memberships;
DROP POLICY IF EXISTS "Users can create customer memberships for their organization" ON customer_memberships;
DROP POLICY IF EXISTS "Users can update customer memberships in their organization" ON customer_memberships;
DROP POLICY IF EXISTS "Users can delete customer memberships in their organization" ON customer_memberships;

-- Recreate RLS policies with support for both customer_id and client_id
CREATE POLICY "Users can view customer memberships from their organization" ON customer_memberships
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create customer memberships for their organization" ON customer_memberships
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update customer memberships in their organization" ON customer_memberships
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete customer memberships in their organization" ON customer_memberships
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );