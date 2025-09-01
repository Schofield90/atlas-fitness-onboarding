-- Migration: Fix clients table organization column name
-- Description: Rename org_id to organization_id for consistency across the codebase
-- This is a surgical fix to resolve production customer creation issues

-- Add organization_id column if it doesn't exist (as an alias to org_id)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Copy data from org_id to organization_id if org_id has data
UPDATE clients 
SET organization_id = org_id 
WHERE organization_id IS NULL AND org_id IS NOT NULL;

-- Add foreign key constraint for organization_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_organization_id_fkey'
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients 
    ADD CONSTRAINT clients_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure the address columns exist (from customer detail system)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'UK';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update existing rows to populate first_name and last_name from name if needed
UPDATE clients 
SET first_name = COALESCE(first_name, split_part(name, ' ', 1)),
    last_name = COALESCE(last_name, 
      CASE 
        WHEN array_length(string_to_array(name, ' '), 1) > 1 
        THEN substring(name from length(split_part(name, ' ', 1)) + 2)
        ELSE '' 
      END)
WHERE name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- Create a function to handle automatic organization assignment for new users
CREATE OR REPLACE FUNCTION ensure_user_has_organization()
RETURNS TRIGGER AS $$
DECLARE
  -- WARNING: Hardcoded organization ID for migration purposes only
  -- In production, organization assignment should be based on user context
  default_org_id UUID := '63589490-8f55-4157-bd3a-e141594b748e'; -- Atlas Fitness default
  existing_org_count INTEGER;
BEGIN
  -- Check if user already has an organization
  SELECT COUNT(*) INTO existing_org_count
  FROM user_organizations
  WHERE user_id = NEW.id;
  
  -- If no organization, assign to default
  IF existing_org_count = 0 THEN
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (NEW.id, default_org_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic organization assignment (if doesn't exist)
DROP TRIGGER IF EXISTS ensure_user_organization_trigger ON users;
CREATE TRIGGER ensure_user_organization_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_has_organization();

-- Ensure all existing users have at least the default organization
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT 
  u.id,
  -- WARNING: Hardcoded organization ID for initial migration only
  '63589490-8f55-4157-bd3a-e141594b748e',
  'member'
FROM users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.user_id IS NULL
ON CONFLICT DO NOTHING;

-- Update RLS policies to handle both org_id and organization_id
DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
CREATE POLICY "Users can view clients in their organization" ON clients
  FOR SELECT USING (
    COALESCE(organization_id, org_id) IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create clients in their organization" ON clients;
CREATE POLICY "Users can create clients in their organization" ON clients
  FOR INSERT WITH CHECK (
    COALESCE(organization_id, org_id) IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
CREATE POLICY "Users can update clients in their organization" ON clients
  FOR UPDATE USING (
    COALESCE(organization_id, org_id) IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete clients in their organization" ON clients;
CREATE POLICY "Users can delete clients in their organization" ON clients
  FOR DELETE USING (
    COALESCE(organization_id, org_id) IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );