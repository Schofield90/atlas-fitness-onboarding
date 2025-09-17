-- Add last_visit column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_visit DATE;

-- Add total_visits column if it does not exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;

-- Update existing clients with their last visit from class_bookings
UPDATE clients c
SET 
  last_visit = (
    SELECT MAX(cb.booking_date)
    FROM class_bookings cb
    WHERE (cb.client_id = c.id OR cb.customer_id = c.id)
    AND cb.booking_status = 'confirmed'
  ),
  total_visits = (
    SELECT COUNT(*)
    FROM class_bookings cb
    WHERE (cb.client_id = c.id OR cb.customer_id = c.id)
    AND cb.booking_status = 'confirmed'
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
      last_visit = GREATEST(COALESCE(last_visit, NEW.booking_date), NEW.booking_date),
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
      last_visit = (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_client_status 
ON class_bookings(client_id, booking_status, booking_date);

CREATE INDEX IF NOT EXISTS idx_class_bookings_customer_status 
ON class_bookings(customer_id, booking_status, booking_date);

-- Add comments explaining the fields
COMMENT ON COLUMN clients.last_visit IS 'Last date this client attended a class (auto-updated from class_bookings)';
COMMENT ON COLUMN clients.total_visits IS 'Total number of confirmed class bookings for this client (auto-updated)';