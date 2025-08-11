-- Fix organization creation issues
-- 1. Add missing INSERT policy for organizations table
-- 2. Fix column issues in organization_members table
-- 3. Add missing columns to organizations table

-- First, add missing columns to organizations table if they don't exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'gym',
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS address text;

-- Add is_active column to organization_members if it doesn't exist
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Rename org_id to organization_id if needed (checking first)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_members' 
    AND column_name = 'org_id'
  ) THEN
    ALTER TABLE organization_members 
    RENAME COLUMN org_id TO organization_id;
  END IF;
END $$;

-- Enable RLS on organizations if not already enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their organizations" ON organizations;

-- CRITICAL: Add INSERT policy for organizations
CREATE POLICY "Users can insert their own organizations" ON organizations
FOR INSERT 
WITH CHECK (true); -- Allow any authenticated user to create an organization

-- Add SELECT policy
CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Add UPDATE policy
CREATE POLICY "Users can update their organizations" ON organizations
FOR UPDATE
USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Enable RLS on organization_members if not already enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop and recreate organization_members policies
DROP POLICY IF EXISTS "Users can insert themselves as members" ON organization_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON organization_members;

-- Allow users to add themselves to organizations (during onboarding)
CREATE POLICY "Users can insert themselves as members" ON organization_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow users to view their own memberships
CREATE POLICY "Users can view their memberships" ON organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Create user_organizations view for backward compatibility with middleware
CREATE OR REPLACE VIEW user_organizations AS
SELECT 
  user_id,
  organization_id,
  role,
  is_active,
  created_at
FROM organization_members;

-- Grant necessary permissions
GRANT SELECT ON user_organizations TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;