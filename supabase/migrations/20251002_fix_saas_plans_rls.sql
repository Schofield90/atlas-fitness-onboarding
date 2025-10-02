-- Add RLS policies for saas_plans table
-- This table should be readable by authenticated users but only writable by service role (admin operations)

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow service role full access to saas_plans" ON saas_plans;
DROP POLICY IF EXISTS "Allow authenticated users to read saas_plans" ON saas_plans;

-- Allow all authenticated users to read plans (needed for signup/billing pages)
CREATE POLICY "Allow authenticated users to read saas_plans"
  ON saas_plans
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access (for admin operations)
CREATE POLICY "Allow service role full access to saas_plans"
  ON saas_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
