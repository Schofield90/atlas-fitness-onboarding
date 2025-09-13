-- =====================================================
-- EMERGENCY FIX: Create staff_calendar_bookings_view
-- Run this in Supabase SQL Editor to fix the calendar
-- =====================================================

-- First check if the base tables exist
DO $$ 
BEGIN
    -- Create the view if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_views WHERE viewname = 'staff_calendar_bookings_view') THEN
        
        -- Create the complete calendar view with staff details
        CREATE OR REPLACE VIEW staff_calendar_bookings_view AS
        SELECT 
            scb.*,
            u.email as staff_email,
            COALESCE(sp.first_name || ' ' || sp.last_name, u.email) as staff_full_name,
            COALESCE(
                scb.color_hex,
                CASE scb.booking_type
                    WHEN 'pt_session_121' THEN '#3B82F6'      -- Blue
                    WHEN 'group_class' THEN '#10B981'         -- Green
                    WHEN 'gym_floor_time' THEN '#F59E0B'      -- Amber
                    WHEN 'staff_meeting' THEN '#EF4444'       -- Red
                    WHEN 'consultation' THEN '#8B5CF6'        -- Purple
                    WHEN 'equipment_maintenance' THEN '#6B7280' -- Gray
                    WHEN 'facility_cleaning' THEN '#06B6D4'   -- Cyan
                    WHEN 'private_event' THEN '#EC4899'       -- Pink
                    WHEN 'break_time' THEN '#84CC16'          -- Lime
                    WHEN 'training_session' THEN '#F97316'    -- Orange
                    ELSE '#6B7280'                             -- Default Gray
                END
            ) as display_color,
            0 as confirmed_client_count
        FROM staff_calendar_bookings scb
        LEFT JOIN auth.users u ON scb.staff_id = u.id
        LEFT JOIN staff_profiles sp ON scb.staff_id = sp.user_id;
        
        RAISE NOTICE 'Created staff_calendar_bookings_view';
    END IF;
END $$;

-- If the view exists but the table doesn't, we need to create a temporary fallback
DO $$ 
BEGIN
    -- Check if staff_calendar_bookings table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'staff_calendar_bookings') THEN
        
        -- Create a temporary empty view that returns the expected structure
        DROP VIEW IF EXISTS staff_calendar_bookings_view CASCADE;
        
        CREATE OR REPLACE VIEW staff_calendar_bookings_view AS
        SELECT 
            cs.id::uuid as id,
            cs.organization_id,
            COALESCE(p.name, 'Class Session') as title,
            p.description as description,
            'group_class'::text as booking_type,
            'confirmed'::text as status,
            cs.start_time,
            cs.start_time + (cs.duration_minutes || ' minutes')::interval as end_time,
            false as all_day,
            cs.instructor_id as staff_id,
            cs.instructor_name as staff_name,
            cs.location,
            cs.location as room_area,
            COALESCE(cs.capacity, cs.max_capacity) as max_capacity,
            cs.current_bookings,
            '#10B981' as color_hex,
            cs.id as class_session_id,
            jsonb_build_object('synced_from_class', true) as metadata,
            null::text as notes,
            cs.created_at,
            cs.updated_at,
            '#10B981' as display_color,
            u.email as staff_email,
            COALESCE(sp.first_name || ' ' || sp.last_name, cs.instructor_name, u.email) as staff_full_name,
            (
                SELECT COUNT(*) 
                FROM bookings b 
                WHERE b.class_session_id = cs.id 
                AND b.status = 'confirmed'
            ) as confirmed_client_count
        FROM class_sessions cs
        LEFT JOIN programs p ON cs.program_id = p.id
        LEFT JOIN auth.users u ON cs.instructor_id = u.id
        LEFT JOIN staff_profiles sp ON cs.instructor_id = sp.user_id
        WHERE cs.start_time >= NOW() - interval '30 days';
        
        RAISE NOTICE 'Created fallback staff_calendar_bookings_view from class_sessions';
    END IF;
END $$;

-- Grant permissions to authenticated users
GRANT SELECT ON staff_calendar_bookings_view TO authenticated;

-- Enable RLS if not already enabled (safe to run multiple times)
DO $$ 
BEGIN
    -- Check if the actual table exists before trying to enable RLS
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'staff_calendar_bookings') THEN
        ALTER TABLE staff_calendar_bookings ENABLE ROW LEVEL SECURITY;
        
        -- Create basic RLS policy if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'staff_calendar_bookings' 
            AND policyname = 'Staff can view all bookings in their organization'
        ) THEN
            CREATE POLICY "Staff can view all bookings in their organization"
                ON staff_calendar_bookings FOR SELECT
                USING (
                    organization_id IN (
                        SELECT organization_id FROM user_organizations 
                        WHERE user_id = auth.uid()
                    )
                );
        END IF;
    END IF;
END $$;

-- Test the view
SELECT 
    'View created successfully. Found ' || COUNT(*)::text || ' bookings.' as status
FROM staff_calendar_bookings_view
LIMIT 1;