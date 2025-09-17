-- Fix last_visit_date and total_visits for clients based on class_bookings
-- This migration creates a trigger to automatically update these fields when bookings are created/updated

-- First, update all existing clients with their actual last visit and total visits
UPDATE clients c
SET 
  last_visit_date = COALESCE(
    (
      SELECT MAX(cb.booking_date)
      FROM class_bookings cb
      WHERE (cb.client_id = c.id OR cb.customer_id = c.id)
      AND cb.booking_status = 'confirmed'
    ),
    c.last_visit_date
  ),
  total_visits = COALESCE(
    (
      SELECT COUNT(*)
      FROM class_bookings cb
      WHERE (cb.client_id = c.id OR cb.customer_id = c.id)
      AND cb.booking_status = 'confirmed'
    ),
    c.total_visits,
    0
  )
WHERE c.organization_id IS NOT NULL;

-- Create function to update client visit stats
CREATE OR REPLACE FUNCTION update_client_visit_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process confirmed bookings
  IF NEW.booking_status = 'confirmed' THEN
    -- Update client's last visit date and total visits
    UPDATE clients
    SET 
      last_visit_date = GREATEST(COALESCE(last_visit_date, NEW.booking_date), NEW.booking_date),
      total_visits = COALESCE(total_visits, 0) + 
        CASE 
          -- If this is an INSERT (new booking), increment
          WHEN TG_OP = 'INSERT' THEN 1
          -- If this is an UPDATE and status changed to confirmed, increment
          WHEN TG_OP = 'UPDATE' AND OLD.booking_status != 'confirmed' THEN 1
          ELSE 0
        END,
      updated_at = NOW()
    WHERE id = COALESCE(NEW.client_id, NEW.customer_id);
  
  -- If status changed FROM confirmed to something else, decrement
  ELSIF TG_OP = 'UPDATE' AND OLD.booking_status = 'confirmed' AND NEW.booking_status != 'confirmed' THEN
    UPDATE clients
    SET 
      total_visits = GREATEST(COALESCE(total_visits, 0) - 1, 0),
      updated_at = NOW()
    WHERE id = COALESCE(NEW.client_id, NEW.customer_id);
    
    -- Also recalculate last_visit_date in case this was their last visit
    UPDATE clients c
    SET 
      last_visit_date = (
        SELECT MAX(cb.booking_date)
        FROM class_bookings cb
        WHERE (cb.client_id = c.id OR cb.customer_id = c.id)
        AND cb.booking_status = 'confirmed'
        AND cb.id != NEW.id
      )
    WHERE c.id = COALESCE(NEW.client_id, NEW.customer_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_client_visit_stats_trigger ON class_bookings;

-- Create trigger for class bookings
CREATE TRIGGER update_client_visit_stats_trigger
AFTER INSERT OR UPDATE OF booking_status ON class_bookings
FOR EACH ROW
EXECUTE FUNCTION update_client_visit_stats();

-- Fix for class calendar: Ensure class_sessions have proper capacity defaults
UPDATE class_sessions
SET capacity = COALESCE(capacity, 20)
WHERE capacity IS NULL OR capacity = 0;

-- Update programs to have default capacity if missing
UPDATE programs
SET max_capacity = COALESCE(max_capacity, 20)
WHERE max_capacity IS NULL OR max_capacity = 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_client_status 
ON class_bookings(client_id, booking_status, booking_date);

CREATE INDEX IF NOT EXISTS idx_class_bookings_customer_status 
ON class_bookings(customer_id, booking_status, booking_date);

-- Add comment explaining the fields
COMMENT ON COLUMN clients.last_visit_date IS 'Last date this client attended a class (auto-updated from class_bookings)';
COMMENT ON COLUMN clients.total_visits IS 'Total number of confirmed class bookings for this client (auto-updated)';