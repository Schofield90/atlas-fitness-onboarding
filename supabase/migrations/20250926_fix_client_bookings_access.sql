-- Fix RLS policies for clients to view their own bookings

-- Allow clients to view their own bookings
CREATE POLICY "Clients can view their own bookings" ON bookings
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Allow service role full access (already exists but just to be sure)
CREATE POLICY "Service role bypass for bookings" ON bookings
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');