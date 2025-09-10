-- Add RLS policies for class_bookings table so clients can view their bookings

-- Enable RLS on class_bookings if not already enabled
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can view their class bookings" ON class_bookings;
DROP POLICY IF EXISTS "Clients can view class bookings by customer_id" ON class_bookings;

-- Policy 1: Clients can view their own bookings (by client_id)
CREATE POLICY "Clients can view their class bookings" ON class_bookings
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Clients can also view bookings linked via customer_id (legacy)
CREATE POLICY "Clients can view class bookings by customer_id" ON class_bookings
  FOR SELECT
  USING (
    customer_id IN (
      -- Get lead IDs that belong to this client
      SELECT l.id 
      FROM leads l 
      JOIN clients c ON (l.client_id = c.id OR l.email = c.email)
      WHERE c.user_id = auth.uid()
    )
  );

-- Ensure clients can see all class session data they need
DROP POLICY IF EXISTS "Clients can view class sessions for their bookings" ON class_sessions;
CREATE POLICY "Clients can view class sessions for their bookings" ON class_sessions
  FOR SELECT
  USING (
    -- Allow if they have a booking for this session in either table
    id IN (
      SELECT class_session_id FROM bookings 
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
    OR id IN (
      SELECT class_session_id FROM class_bookings 
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
    OR id IN (
      SELECT b.class_session_id 
      FROM bookings b
      JOIN leads l ON b.customer_id = l.id
      JOIN clients c ON (l.client_id = c.id OR l.email = c.email)
      WHERE c.user_id = auth.uid()
    )
    OR id IN (
      SELECT cb.class_session_id 
      FROM class_bookings cb
      JOIN leads l ON cb.customer_id = l.id
      JOIN clients c ON (l.client_id = c.id OR l.email = c.email)
      WHERE c.user_id = auth.uid()
    )
    -- Or if it's a future session for their organization
    OR (
      organization_id IN (
        SELECT organization_id FROM clients WHERE user_id = auth.uid()
      )
      AND start_time > NOW()
    )
  );