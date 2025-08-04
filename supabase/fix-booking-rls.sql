-- First, check if RLS is enabled on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Enable read access for all users" ON bookings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON bookings;
DROP POLICY IF EXISTS "Enable update for users based on organization" ON bookings;
DROP POLICY IF EXISTS "Enable delete for users based on organization" ON bookings;

-- Create new, more permissive policies for bookings

-- Allow authenticated users to read all bookings for classes in their organization
CREATE POLICY "Users can view bookings for their organization's classes" ON bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_sessions cs
    WHERE cs.id = bookings.class_session_id
    AND cs.organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow service role to bypass RLS (for admin operations)
CREATE POLICY "Service role has full access" ON bookings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert bookings for their organization's classes
CREATE POLICY "Users can create bookings for their organization's classes" ON bookings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM class_sessions cs
    WHERE cs.id = class_session_id
    AND cs.organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Verify the policies are created
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'bookings';