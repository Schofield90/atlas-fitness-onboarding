-- Migration: Fix booking counts and add automatic count updates
-- Date: 2025-09-08

-- Part 1: Update all existing booking counts to be accurate
UPDATE class_sessions cs
SET current_bookings = (
  SELECT COUNT(*)
  FROM class_bookings cb
  WHERE cb.class_session_id = cs.id
  AND cb.booking_status IN ('confirmed', 'attended')
);

-- Part 2: Create a function to automatically update booking counts
CREATE OR REPLACE FUNCTION update_class_session_booking_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the count for the affected class session
  IF TG_OP = 'INSERT' THEN
    UPDATE class_sessions
    SET current_bookings = current_bookings + 1
    WHERE id = NEW.class_session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE class_sessions
    SET current_bookings = GREATEST(current_bookings - 1, 0)
    WHERE id = OLD.class_session_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If the class_session_id changed, update both old and new sessions
    IF OLD.class_session_id != NEW.class_session_id THEN
      UPDATE class_sessions
      SET current_bookings = GREATEST(current_bookings - 1, 0)
      WHERE id = OLD.class_session_id;
      
      UPDATE class_sessions
      SET current_bookings = current_bookings + 1
      WHERE id = NEW.class_session_id;
    END IF;
    -- If booking status changed from confirmed to cancelled or vice versa
    IF OLD.booking_status != NEW.booking_status THEN
      IF NEW.booking_status IN ('confirmed', 'attended') AND OLD.booking_status NOT IN ('confirmed', 'attended') THEN
        UPDATE class_sessions
        SET current_bookings = current_bookings + 1
        WHERE id = NEW.class_session_id;
      ELSIF OLD.booking_status IN ('confirmed', 'attended') AND NEW.booking_status NOT IN ('confirmed', 'attended') THEN
        UPDATE class_sessions
        SET current_bookings = GREATEST(current_bookings - 1, 0)
        WHERE id = NEW.class_session_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Part 3: Create triggers for automatic count updates
DROP TRIGGER IF EXISTS update_booking_count_on_insert ON class_bookings;
CREATE TRIGGER update_booking_count_on_insert
AFTER INSERT ON class_bookings
FOR EACH ROW
WHEN (NEW.booking_status IN ('confirmed', 'attended'))
EXECUTE FUNCTION update_class_session_booking_count();

DROP TRIGGER IF EXISTS update_booking_count_on_delete ON class_bookings;
CREATE TRIGGER update_booking_count_on_delete
AFTER DELETE ON class_bookings
FOR EACH ROW
WHEN (OLD.booking_status IN ('confirmed', 'attended'))
EXECUTE FUNCTION update_class_session_booking_count();

DROP TRIGGER IF EXISTS update_booking_count_on_update ON class_bookings;
CREATE TRIGGER update_booking_count_on_update
AFTER UPDATE ON class_bookings
FOR EACH ROW
EXECUTE FUNCTION update_class_session_booking_count();

-- Part 4: Also handle the bookings table (legacy)
DROP TRIGGER IF EXISTS update_booking_count_on_insert_bookings ON bookings;
CREATE TRIGGER update_booking_count_on_insert_bookings
AFTER INSERT ON bookings
FOR EACH ROW
WHEN (NEW.status IN ('confirmed', 'attended'))
EXECUTE FUNCTION update_class_session_booking_count();

DROP TRIGGER IF EXISTS update_booking_count_on_delete_bookings ON bookings;
CREATE TRIGGER update_booking_count_on_delete_bookings
AFTER DELETE ON bookings
FOR EACH ROW
WHEN (OLD.status IN ('confirmed', 'attended'))
EXECUTE FUNCTION update_class_session_booking_count();

-- Part 5: Fix the function to handle both tables
CREATE OR REPLACE FUNCTION update_class_session_booking_count()
RETURNS TRIGGER AS $$
DECLARE
  v_class_session_id UUID;
  v_status TEXT;
  v_old_status TEXT;
BEGIN
  -- Handle both bookings and class_bookings tables
  IF TG_TABLE_NAME = 'bookings' THEN
    v_class_session_id := COALESCE(NEW.class_session_id, OLD.class_session_id);
    v_status := NEW.status;
    v_old_status := OLD.status;
  ELSE
    v_class_session_id := COALESCE(NEW.class_session_id, OLD.class_session_id);
    v_status := NEW.booking_status;
    v_old_status := OLD.booking_status;
  END IF;

  -- Only proceed if we have a class_session_id
  IF v_class_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Recalculate the total count for this session
  UPDATE class_sessions
  SET current_bookings = (
    SELECT COUNT(*)
    FROM (
      SELECT id FROM class_bookings 
      WHERE class_session_id = v_class_session_id 
      AND booking_status IN ('confirmed', 'attended')
      UNION ALL
      SELECT id FROM bookings 
      WHERE class_session_id = v_class_session_id 
      AND status IN ('confirmed', 'attended')
    ) combined_bookings
  )
  WHERE id = v_class_session_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Part 6: Final recount to ensure accuracy
UPDATE class_sessions cs
SET current_bookings = (
  SELECT COUNT(*)
  FROM (
    SELECT id FROM class_bookings 
    WHERE class_session_id = cs.id 
    AND booking_status IN ('confirmed', 'attended')
    UNION ALL
    SELECT id FROM bookings 
    WHERE class_session_id = cs.id 
    AND status IN ('confirmed', 'attended')
  ) combined_bookings
);

-- Display the results
DO $$
BEGIN
  RAISE NOTICE 'Booking count synchronization completed!';
  RAISE NOTICE 'Triggers installed for automatic count updates.';
END $$;