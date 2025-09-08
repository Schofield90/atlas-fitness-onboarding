-- Migration: Fix booking system for multi-tenant SaaS
-- This migration works for ALL organizations, not hardcoded for any specific one
-- Date: 2025-09-08

-- =====================================================================
-- PART 1: Fix booking counts for ALL organizations
-- =====================================================================

-- Update all class_sessions to have accurate booking counts
UPDATE class_sessions 
SET current_bookings = (
    SELECT COUNT(*)
    FROM class_bookings cb
    WHERE cb.class_session_id = class_sessions.id
    AND cb.booking_status IN ('confirmed', 'attended')
);

-- Also count bookings from the legacy bookings table
UPDATE class_sessions 
SET current_bookings = current_bookings + (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.class_session_id = class_sessions.id
    AND b.status IN ('confirmed', 'attended')
    AND NOT EXISTS (
        -- Avoid double counting if same booking exists in both tables
        SELECT 1 FROM class_bookings cb 
        WHERE cb.class_session_id = b.class_session_id
        AND (
            (cb.customer_id = b.customer_id AND b.customer_id IS NOT NULL) OR
            (cb.client_id = b.client_id AND b.client_id IS NOT NULL)
        )
    )
)
WHERE EXISTS (
    SELECT 1 FROM bookings b2
    WHERE b2.class_session_id = class_sessions.id
);

-- =====================================================================
-- PART 2: Create automatic trigger for booking count updates
-- =====================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_booking_count_trigger() CASCADE;

-- Create a function that automatically updates booking counts
CREATE OR REPLACE FUNCTION update_booking_count_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_session_id UUID;
    v_old_status TEXT;
    v_new_status TEXT;
BEGIN
    -- Determine which table triggered this and get the appropriate values
    IF TG_TABLE_NAME = 'class_bookings' THEN
        v_session_id := COALESCE(NEW.class_session_id, OLD.class_session_id);
        v_old_status := OLD.booking_status;
        v_new_status := NEW.booking_status;
    ELSIF TG_TABLE_NAME = 'bookings' THEN
        v_session_id := COALESCE(NEW.class_session_id, OLD.class_session_id);
        v_old_status := OLD.status;
        v_new_status := NEW.status;
    END IF;

    -- Skip if no session ID
    IF v_session_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Handle different operations
    IF TG_OP = 'INSERT' THEN
        -- New booking added
        IF v_new_status IN ('confirmed', 'attended') THEN
            UPDATE class_sessions 
            SET current_bookings = current_bookings + 1
            WHERE id = v_session_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Booking removed
        IF v_old_status IN ('confirmed', 'attended') THEN
            UPDATE class_sessions 
            SET current_bookings = GREATEST(current_bookings - 1, 0)
            WHERE id = v_session_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Booking status changed
        IF v_old_status IN ('confirmed', 'attended') AND v_new_status NOT IN ('confirmed', 'attended') THEN
            -- Was counted, now shouldn't be
            UPDATE class_sessions 
            SET current_bookings = GREATEST(current_bookings - 1, 0)
            WHERE id = v_session_id;
        ELSIF v_old_status NOT IN ('confirmed', 'attended') AND v_new_status IN ('confirmed', 'attended') THEN
            -- Wasn't counted, now should be
            UPDATE class_sessions 
            SET current_bookings = current_bookings + 1
            WHERE id = v_session_id;
        END IF;
        
        -- Handle session changes
        IF TG_TABLE_NAME = 'class_bookings' AND OLD.class_session_id IS DISTINCT FROM NEW.class_session_id THEN
            -- Moved to different session
            IF v_old_status IN ('confirmed', 'attended') THEN
                UPDATE class_sessions 
                SET current_bookings = GREATEST(current_bookings - 1, 0)
                WHERE id = OLD.class_session_id;
            END IF;
            IF v_new_status IN ('confirmed', 'attended') THEN
                UPDATE class_sessions 
                SET current_bookings = current_bookings + 1
                WHERE id = NEW.class_session_id;
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for class_bookings table
DROP TRIGGER IF EXISTS update_booking_count_on_class_bookings ON class_bookings;
CREATE TRIGGER update_booking_count_on_class_bookings
AFTER INSERT OR UPDATE OR DELETE ON class_bookings
FOR EACH ROW
EXECUTE FUNCTION update_booking_count_trigger();

-- Create triggers for bookings table (legacy)
DROP TRIGGER IF EXISTS update_booking_count_on_bookings ON bookings;
CREATE TRIGGER update_booking_count_on_bookings
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_booking_count_trigger();

-- =====================================================================
-- PART 3: Create a view for unified booking queries
-- =====================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS unified_booking_view CASCADE;

-- Create a unified view that works for all organizations
CREATE OR REPLACE VIEW unified_booking_view AS
SELECT 
    cb.id,
    cb.class_session_id,
    cb.organization_id,
    COALESCE(cb.customer_id, cb.client_id) as customer_id,
    cb.customer_id as lead_id,
    cb.client_id,
    cb.booking_status as status,
    cb.payment_status,
    cb.created_at,
    cb.updated_at,
    'class_bookings' as source_table,
    -- Customer info with multiple fallbacks
    COALESCE(
        l.first_name || ' ' || l.last_name,
        c.first_name || ' ' || c.last_name,
        l.email,
        c.email,
        'Guest'
    ) as customer_name,
    COALESCE(l.email, c.email) as customer_email,
    COALESCE(l.phone, c.phone) as customer_phone,
    COALESCE(l.status, 'lead') as customer_status
FROM class_bookings cb
LEFT JOIN leads l ON l.id = cb.customer_id
LEFT JOIN clients c ON c.id = cb.client_id

UNION ALL

SELECT 
    b.id,
    b.class_session_id,
    b.org_id as organization_id,
    COALESCE(b.customer_id, b.client_id) as customer_id,
    b.customer_id as lead_id,
    b.client_id,
    b.status,
    b.payment_status,
    b.created_at,
    b.updated_at,
    'bookings' as source_table,
    COALESCE(
        l.first_name || ' ' || l.last_name,
        c.first_name || ' ' || c.last_name,
        l.email,
        c.email,
        'Guest'
    ) as customer_name,
    COALESCE(l.email, c.email) as customer_email,
    COALESCE(l.phone, c.phone) as customer_phone,
    COALESCE(l.status, 'lead') as customer_status
FROM bookings b
LEFT JOIN leads l ON l.id = b.customer_id
LEFT JOIN clients c ON c.id = b.client_id
WHERE b.class_session_id IS NOT NULL;

-- Grant permissions on the view
GRANT SELECT ON unified_booking_view TO authenticated, anon;

-- =====================================================================
-- PART 4: Create helper function for getting session attendees
-- =====================================================================

CREATE OR REPLACE FUNCTION get_session_attendees(p_session_id UUID)
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    status TEXT,
    payment_status TEXT,
    membership_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (COALESCE(ubv.customer_id, ubv.client_id))
        ubv.id,
        COALESCE(ubv.customer_id, ubv.client_id) as customer_id,
        ubv.customer_name,
        ubv.customer_email,
        ubv.customer_phone,
        ubv.status,
        ubv.payment_status,
        COALESCE(
            cm.plan_name,
            CASE 
                WHEN ubv.payment_status = 'succeeded' THEN 'Drop-in'
                WHEN ubv.payment_status = 'comp' THEN 'Complimentary'
                ELSE 'No Membership'
            END
        ) as membership_type
    FROM unified_booking_view ubv
    LEFT JOIN customer_memberships cm ON cm.customer_id = COALESCE(ubv.customer_id, ubv.client_id)
        AND cm.status = 'active'
    WHERE ubv.class_session_id = p_session_id
    AND ubv.status IN ('confirmed', 'attended')
    ORDER BY COALESCE(ubv.customer_id, ubv.client_id), ubv.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_session_attendees(UUID) TO authenticated, anon;

-- =====================================================================
-- PART 5: Create indexes for performance
-- =====================================================================

-- Indexes for class_bookings
CREATE INDEX IF NOT EXISTS idx_class_bookings_session_status 
ON class_bookings(class_session_id, booking_status);

CREATE INDEX IF NOT EXISTS idx_class_bookings_customer_org 
ON class_bookings(customer_id, organization_id) 
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_class_bookings_client_org 
ON class_bookings(client_id, organization_id) 
WHERE client_id IS NOT NULL;

-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_session_status 
ON bookings(class_session_id, status)
WHERE class_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_org 
ON bookings(customer_id, org_id) 
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_org 
ON bookings(client_id, org_id) 
WHERE client_id IS NOT NULL;

-- =====================================================================
-- PART 6: Final verification
-- =====================================================================

DO $$
DECLARE
    v_fixed_count INTEGER;
BEGIN
    -- Count how many sessions were fixed
    SELECT COUNT(*) INTO v_fixed_count
    FROM class_sessions
    WHERE current_bookings > 0;
    
    RAISE NOTICE 'Booking system migration completed!';
    RAISE NOTICE 'Fixed booking counts for % class sessions', v_fixed_count;
    RAISE NOTICE 'Automatic triggers installed for future updates';
    RAISE NOTICE 'Unified view created for consistent queries';
END $$;