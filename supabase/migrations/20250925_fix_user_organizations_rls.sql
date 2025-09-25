-- Fix RLS policies on user_organizations to allow users to read their own records

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own organizations" ON user_organizations;
DROP POLICY IF EXISTS "Users can read their organization links" ON user_organizations;
DROP POLICY IF EXISTS "Service role full access" ON user_organizations;

-- Enable RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own organization links
CREATE POLICY "Users can read their organization links"
ON user_organizations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for service role to have full access
CREATE POLICY "Service role full access"
ON user_organizations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Also ensure authenticated users can insert during signup
CREATE POLICY "Service role can insert"
ON user_organizations
FOR INSERT
TO service_role
WITH CHECK (true);