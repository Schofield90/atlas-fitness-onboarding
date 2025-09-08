-- Rollback Migration: Revert booking system constraint and RLS policy fixes
-- This safely reverts the changes made in 20250908_fix_booking_system_comprehensive.sql
-- Date: 2025-09-08
-- Author: DB Migrator Agent

-- =============================================================================
-- PART 1: Revert constraint changes
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting rollback of booking system fixes...';
END $$;

-- Revert bookings table constraint to original restrictive version
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_customer_or_client_booking' 
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT check_customer_or_client_booking;
    RAISE NOTICE 'Dropped modified constraint from bookings table';
  END IF;
  
  -- Restore original constraint (exactly one customer type required)
  ALTER TABLE bookings 
  ADD CONSTRAINT check_customer_or_client_booking 
  CHECK (
    (customer_id IS NOT NULL AND client_id IS NULL) OR 
    (customer_id IS NULL AND client_id IS NOT NULL)
  );
  RAISE NOTICE 'Restored original constraint to bookings table';
END $$;

-- Revert class_bookings table constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_customer_or_client_booking' 
    AND table_name = 'class_bookings'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'class_bookings'
  ) THEN
    ALTER TABLE class_bookings DROP CONSTRAINT check_customer_or_client_booking;
    
    -- Restore original constraint
    ALTER TABLE class_bookings 
    ADD CONSTRAINT check_customer_or_client_booking 
    CHECK (
      (customer_id IS NOT NULL AND client_id IS NULL) OR 
      (customer_id IS NULL AND client_id IS NOT NULL)
    );
    RAISE NOTICE 'Restored original constraint to class_bookings table';
  END IF;
END $$;

-- =============================================================================
-- PART 2: Revert RLS policy changes
-- =============================================================================

-- Revert bookings table RLS policies
DROP POLICY IF EXISTS "Allow booking creation" ON bookings;
DROP POLICY IF EXISTS "Allow booking viewing" ON bookings;
DROP POLICY IF EXISTS "Allow booking updates" ON bookings;

-- Restore original more restrictive policies
CREATE POLICY "Users can create bookings for their organization" ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = class_session_id
      AND cs.organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view bookings for their organization" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = bookings.class_session_id
      AND cs.organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update bookings for their organization" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = bookings.class_session_id
      AND cs.organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid()
      )
    )
  );

-- Revert class_bookings RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_bookings') THEN
    DROP POLICY IF EXISTS "Allow class booking creation" ON class_bookings;
    DROP POLICY IF EXISTS "Allow class booking viewing" ON class_bookings;
    DROP POLICY IF EXISTS "Allow class booking updates" ON class_bookings;
    
    -- Restore original policies (more restrictive)
    CREATE POLICY "Users can create class bookings for their organization" ON class_bookings
      FOR INSERT WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM users 
          WHERE id = auth.uid()
        )
      );
    
    CREATE POLICY "Users can view their organization class bookings" ON class_bookings
      FOR SELECT USING (
        organization_id IN (
          SELECT organization_id FROM users 
          WHERE id = auth.uid()
        )
      );
    
    CREATE POLICY "Users can update their organization class bookings" ON class_bookings
      FOR UPDATE USING (
        organization_id IN (
          SELECT organization_id FROM users 
          WHERE id = auth.uid()
        )
      );
    
    CREATE POLICY "Users can delete their organization class bookings" ON class_bookings
      FOR DELETE USING (
        organization_id IN (
          SELECT organization_id FROM users 
          WHERE id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Restored original RLS policies for class_bookings table';
  END IF;
END $$;

-- =============================================================================
-- PART 3: Remove unified view
-- =============================================================================

-- Drop the unified booking view created in the forward migration
DROP VIEW IF EXISTS unified_bookings;
RAISE NOTICE 'Dropped unified_bookings view';

-- =============================================================================
-- PART 4: Revert permissions
-- =============================================================================

-- Revoke anonymous permissions (restore to more restrictive access)
REVOKE INSERT, SELECT, UPDATE ON bookings FROM anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_bookings') THEN
    REVOKE INSERT, SELECT, UPDATE ON class_bookings FROM anon;
    RAISE NOTICE 'Revoked anonymous permissions from class_bookings';
  END IF;
END $$;

-- Keep authenticated user permissions but could be further restricted if needed
RAISE NOTICE 'Anonymous user permissions revoked';

-- =============================================================================
-- PART 5: Note about indexes and columns
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'BOOKING SYSTEM ROLLBACK COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT NOTES:';
  RAISE NOTICE '- Constraints reverted to original restrictive version';
  RAISE NOTICE '- RLS policies restored to organization-based access only';
  RAISE NOTICE '- Anonymous access permissions removed';
  RAISE NOTICE '- Unified booking view removed';
  RAISE NOTICE '';
  RAISE NOTICE 'MANUAL CLEANUP NEEDED:';
  RAISE NOTICE '- Performance indexes created by forward migration remain';
  RAISE NOTICE '- Additional columns (client_id, organization_id) remain on class_bookings';
  RAISE NOTICE '- These were not removed to prevent data loss';
  RAISE NOTICE '';
  RAISE NOTICE 'If you need to completely revert schema changes:';
  RAISE NOTICE '1. Backup any important data first';
  RAISE NOTICE '2. Manually drop the additional columns if desired';
  RAISE NOTICE '3. Drop the performance indexes if not needed';
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback completed successfully!';
END $$;