-- Migration: Fix leads table to use organization-based sharing
-- This allows all users in the same organization to access shared leads

-- First, ensure organizations table exists
CREATE TABLE IF NOT EXISTS organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure users table has organization_id
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Update leads table structure
-- Add organization_id if it doesn't exist
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add created_by to track who created the lead
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_to for lead assignment
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Migrate existing data from user_id to organization_id
-- This assumes users have been properly assigned to organizations
UPDATE leads l
SET 
  organization_id = u.organization_id,
  created_by = l.user_id
FROM users u
WHERE l.user_id = u.id 
  AND l.organization_id IS NULL
  AND u.organization_id IS NOT NULL;

-- Drop the old user_id column if it exists (after data migration)
-- Note: Only uncomment this after verifying data migration is successful
-- ALTER TABLE leads DROP COLUMN IF EXISTS user_id;

-- Drop old RLS policies that use user_id
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can create their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;

-- Create new RLS policies based on organization_id
-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id 
  FROM users 
  WHERE id = auth.uid()
  LIMIT 1
$$;

-- Policy: Users can view all leads in their organization
CREATE POLICY "Users can view organization leads" ON leads
  FOR SELECT USING (
    organization_id = auth.get_user_organization_id()
  );

-- Policy: Users can create leads in their organization
CREATE POLICY "Users can create organization leads" ON leads
  FOR INSERT WITH CHECK (
    organization_id = auth.get_user_organization_id()
    AND created_by = auth.uid()
  );

-- Policy: Users can update leads in their organization
CREATE POLICY "Users can update organization leads" ON leads
  FOR UPDATE USING (
    organization_id = auth.get_user_organization_id()
  );

-- Policy: Users can delete leads from their organization
CREATE POLICY "Users can delete organization leads" ON leads
  FOR DELETE USING (
    organization_id = auth.get_user_organization_id()
  );

-- Add trigger to automatically set created_by on insert
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_lead_created_by ON leads;
CREATE TRIGGER set_lead_created_by
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- Create a view for easier querying with creator and assignee details
CREATE OR REPLACE VIEW leads_with_users AS
SELECT 
  l.*,
  creator.email as created_by_email,
  creator.name as created_by_name,
  assignee.email as assigned_to_email,
  assignee.name as assigned_to_name
FROM leads l
LEFT JOIN users creator ON l.created_by = creator.id
LEFT JOIN users assignee ON l.assigned_to = assignee.id;

-- Grant access to the view
GRANT SELECT ON leads_with_users TO authenticated;

-- Add comment explaining the structure
COMMENT ON TABLE leads IS 'Leads are shared across all users in the same organization. created_by tracks who created the lead, assigned_to tracks who it is assigned to.';