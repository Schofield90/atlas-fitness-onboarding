-- Update RLS policies for saas_plans to allow admin full access

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read saas_plans" ON saas_plans;
DROP POLICY IF EXISTS "Allow all authenticated to read saas_plans" ON saas_plans;
DROP POLICY IF EXISTS "Allow admin users full access to saas_plans" ON saas_plans;

-- Allow admin user full access (sam@gymleadhub.co.uk)
CREATE POLICY "Allow admin users full access to saas_plans"
  ON saas_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'sam@gymleadhub.co.uk'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'sam@gymleadhub.co.uk'
    )
  );

-- Allow all other authenticated users to read plans (for signup/billing pages)
CREATE POLICY "Allow all authenticated to read saas_plans"
  ON saas_plans
  FOR SELECT
  TO authenticated
  USING (true);
