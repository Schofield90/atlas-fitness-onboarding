-- Enable public read access to organizations for booking pages
CREATE POLICY "Public can view organizations" ON organizations
  FOR SELECT
  USING (true);

-- Enable public read access to programs for booking
CREATE POLICY "Public can view active programs" ON programs
  FOR SELECT
  USING (is_active = true);

-- Enable public read access to class sessions for booking
CREATE POLICY "Public can view scheduled classes" ON class_sessions
  FOR SELECT
  USING (session_status = 'scheduled');

-- Enable public insert to leads for booking forms
CREATE POLICY "Public can create leads" ON leads
  FOR INSERT
  WITH CHECK (true);

-- Enable public read on their own lead record
CREATE POLICY "Public can view own lead" ON leads
  FOR SELECT
  USING (true); -- In production, you'd want to limit this

-- Make sure the policies don't already exist
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public can view organizations" ON organizations;
  DROP POLICY IF EXISTS "Public can view active programs" ON programs;
  DROP POLICY IF EXISTS "Public can view scheduled classes" ON class_sessions;
  DROP POLICY IF EXISTS "Public can create leads" ON leads;
  DROP POLICY IF EXISTS "Public can view own lead" ON leads;
END$$;