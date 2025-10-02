-- Fix RLS policies for saas_plans using JWT instead of users table lookup
-- This avoids "permission denied for table users" error

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admin users full access to saas_plans" ON saas_plans;
DROP POLICY IF EXISTS "Allow all authenticated to read saas_plans" ON saas_plans;

-- Allow admin user full access using email from JWT (avoids users table lookup)
CREATE POLICY "Allow admin users full access to saas_plans"
  ON saas_plans
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'sam@gymleadhub.co.uk')
  WITH CHECK (auth.jwt() ->> 'email' = 'sam@gymleadhub.co.uk');

-- Allow all other authenticated users to read plans
CREATE POLICY "Allow all authenticated to read saas_plans"
  ON saas_plans
  FOR SELECT
  TO authenticated
  USING (true);
