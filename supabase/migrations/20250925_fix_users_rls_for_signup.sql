-- Allow authenticated users to insert their own user record during signup
-- This is needed for the signup flow to work properly

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Create policy to allow authenticated users to insert their own record
CREATE POLICY "Users can insert their own record"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create policy for service role to bypass all RLS
CREATE POLICY "Service role can manage all users"
ON users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);