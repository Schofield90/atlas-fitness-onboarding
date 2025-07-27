-- Drop existing policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON ai_feedback;

-- Create new policies that allow both authenticated and anon users (for API access)
CREATE POLICY "Enable insert for all users" ON ai_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON ai_feedback
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Enable update for all users" ON ai_feedback
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON ai_feedback
  FOR DELETE TO anon, authenticated
  USING (true);