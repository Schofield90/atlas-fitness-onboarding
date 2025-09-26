-- Fix RLS policies for class schedule access

CREATE POLICY "Clients can view class sessions" ON class_sessions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT org_id FROM clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view programs" ON programs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT org_id FROM clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role bypass for class_sessions" ON class_sessions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role bypass for programs" ON programs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');