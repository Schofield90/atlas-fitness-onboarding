-- Migration: Add organization_id to leads table for proper multi-tenant isolation
-- CRITICAL SECURITY FIX: Without organization-based isolation, users can access/delete data from other gyms

-- Add organization_id column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);

-- Update existing leads to use organization_id from user's organization
-- This assumes users belong to one organization
UPDATE leads l
SET organization_id = (
  SELECT uo.organization_id 
  FROM user_organizations uo 
  WHERE uo.user_id = l.user_id 
  LIMIT 1
)
WHERE l.organization_id IS NULL AND l.user_id IS NOT NULL;

-- Drop old RLS policies that use user_id
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can create their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;

-- Create new RLS policies based on organization_id
-- These policies ensure users can only access data from their own organization

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_organizations
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

-- Policy: Users can only view leads from their organization
CREATE POLICY "Users can view organization leads" ON leads
  FOR SELECT USING (
    organization_id = get_user_organization_id()
  );

-- Policy: Users can only create leads in their organization
CREATE POLICY "Users can create organization leads" ON leads
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
  );

-- Policy: Users can only update leads in their organization
CREATE POLICY "Users can update organization leads" ON leads
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
  );

-- Policy: Users can only delete leads from their organization
CREATE POLICY "Users can delete organization leads" ON leads
  FOR DELETE USING (
    organization_id = get_user_organization_id()
  );

-- Add similar columns and policies to other tables that need organization isolation
-- This is critical for multi-tenant security

-- Add to clients table if it exists
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);

-- Add to staff table if it exists
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_staff_organization_id ON staff(organization_id);

-- Note: After this migration, all queries MUST include organization_id in WHERE clauses
-- This prevents cross-organization data access