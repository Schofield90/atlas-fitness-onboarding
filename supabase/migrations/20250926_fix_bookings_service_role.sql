-- Fix service role access for bookings table

-- Allow service role to bypass all restrictions on bookings
CREATE POLICY "Service role bypass for bookings" ON bookings
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');