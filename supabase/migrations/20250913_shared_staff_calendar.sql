-- =====================================================
-- Shared Staff Calendar System Migration
-- =====================================================
-- Description: Comprehensive shared calendar for gym staff
-- Features: PT sessions, group classes, gym floor time tracking
-- Author: Atlas Fitness Platform
-- Date: 2025-09-13
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Booking types for the calendar
DO $$ BEGIN
    CREATE TYPE booking_type AS ENUM (
        'pt_session_121',        -- 1-to-1 Personal Training
        'group_class',           -- Group fitness class (auto-synced)
        'gym_floor_time',        -- General gym floor supervision
        'staff_meeting',         -- Staff meetings
        'consultation',          -- Member consultations
        'equipment_maintenance', -- Equipment maintenance time
        'facility_cleaning',     -- Deep cleaning slots
        'private_event',         -- Private gym hire
        'break_time',           -- Staff break periods
        'training_session'       -- Staff training/education
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Booking status
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'confirmed',
        'tentative',
        'cancelled',
        'completed',
        'no_show'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- MAIN CALENDAR TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_calendar_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Booking details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    booking_type booking_type NOT NULL,
    status booking_status DEFAULT 'confirmed',
    
    -- Time information
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT false,
    
    -- Staff assignment
    staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    staff_name VARCHAR(255), -- Denormalized for performance
    
    -- Location
    location VARCHAR(255),
    room_area VARCHAR(100), -- e.g., 'Main Floor', 'Studio 1', 'PT Area'
    
    -- Capacity and attendance
    max_capacity INTEGER,
    current_bookings INTEGER DEFAULT 0,
    
    -- Color coding
    color_hex VARCHAR(7), -- Override color for this booking
    
    -- Recurring event support
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule JSONB, -- RRULE format
    parent_booking_id UUID REFERENCES staff_calendar_bookings(id) ON DELETE CASCADE,
    recurrence_exceptions DATE[], -- Dates to skip in recurring series
    
    -- Integration with existing systems
    class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_capacity CHECK (current_bookings <= max_capacity OR max_capacity IS NULL),
    CONSTRAINT valid_color CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$' OR color_hex IS NULL)
);

-- =====================================================
-- CLIENT BOOKINGS FOR CALENDAR ENTRIES
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_calendar_client_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_booking_id UUID NOT NULL REFERENCES staff_calendar_bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Booking details
    booking_status booking_status DEFAULT 'confirmed',
    booking_notes TEXT,
    
    -- Payment tracking
    payment_status VARCHAR(50),
    payment_amount DECIMAL(10, 2),
    
    -- Timestamps
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Ensure either client_id or lead_id is present
    CONSTRAINT has_client_reference CHECK (client_id IS NOT NULL OR lead_id IS NOT NULL)
);

-- =====================================================
-- COLOR COORDINATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_calendar_colors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Color assignment
    booking_type booking_type,
    staff_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    color_hex VARCHAR(7) NOT NULL,
    
    -- Metadata
    label VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_color_hex CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT unique_type_color UNIQUE (organization_id, booking_type, staff_id)
);

-- =====================================================
-- STAFF AVAILABILITY TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_availability_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Availability pattern
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status
    is_available BOOLEAN DEFAULT true,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (organization_id, staff_id, day_of_week, start_time)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Time-based queries
CREATE INDEX idx_staff_calendar_start_time ON staff_calendar_bookings(start_time);
CREATE INDEX idx_staff_calendar_end_time ON staff_calendar_bookings(end_time);
CREATE INDEX idx_staff_calendar_date_range ON staff_calendar_bookings(start_time, end_time);

-- Staff and organization lookups
CREATE INDEX idx_staff_calendar_org ON staff_calendar_bookings(organization_id);
CREATE INDEX idx_staff_calendar_staff ON staff_calendar_bookings(staff_id);
CREATE INDEX idx_staff_calendar_org_staff ON staff_calendar_bookings(organization_id, staff_id);

-- Booking type filtering
CREATE INDEX idx_staff_calendar_type ON staff_calendar_bookings(booking_type);
CREATE INDEX idx_staff_calendar_status ON staff_calendar_bookings(status);

-- Class session integration
CREATE INDEX idx_staff_calendar_class ON staff_calendar_bookings(class_session_id);

-- Recurring events
CREATE INDEX idx_staff_calendar_parent ON staff_calendar_bookings(parent_booking_id);

-- Client bookings
CREATE INDEX idx_client_booking_calendar ON staff_calendar_client_bookings(calendar_booking_id);
CREATE INDEX idx_client_booking_client ON staff_calendar_client_bookings(client_id);

-- =====================================================
-- FUNCTIONS FOR CALENDAR OPERATIONS
-- =====================================================

-- Function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_staff_calendar_conflicts(
    p_staff_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE(
    conflicting_booking_id UUID,
    title VARCHAR(255),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        scb.id,
        scb.title,
        scb.start_time,
        scb.end_time
    FROM staff_calendar_bookings scb
    WHERE scb.staff_id = p_staff_id
        AND scb.status != 'cancelled'
        AND (scb.id != p_exclude_booking_id OR p_exclude_booking_id IS NULL)
        AND (
            (p_start_time >= scb.start_time AND p_start_time < scb.end_time) OR
            (p_end_time > scb.start_time AND p_end_time <= scb.end_time) OR
            (p_start_time <= scb.start_time AND p_end_time >= scb.end_time)
        );
END;
$$ LANGUAGE plpgsql;

-- Function to get staff availability
CREATE OR REPLACE FUNCTION get_staff_availability(
    p_staff_id UUID,
    p_date DATE
)
RETURNS TABLE(
    time_slot TIMESTAMPTZ,
    is_available BOOLEAN,
    booking_title VARCHAR(255)
) AS $$
BEGIN
    -- Generate time slots for the day (30-minute intervals)
    RETURN QUERY
    WITH time_slots AS (
        SELECT generate_series(
            p_date::timestamp + interval '6 hours',
            p_date::timestamp + interval '21 hours 30 minutes',
            interval '30 minutes'
        ) AS slot
    )
    SELECT 
        ts.slot,
        CASE 
            WHEN scb.id IS NULL THEN true
            ELSE false
        END AS is_available,
        scb.title
    FROM time_slots ts
    LEFT JOIN staff_calendar_bookings scb ON (
        scb.staff_id = p_staff_id
        AND scb.status != 'cancelled'
        AND ts.slot >= scb.start_time
        AND ts.slot < scb.end_time
    )
    ORDER BY ts.slot;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create calendar entries from class_sessions
CREATE OR REPLACE FUNCTION sync_class_session_to_calendar()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Insert or update calendar booking
        INSERT INTO staff_calendar_bookings (
            organization_id,
            title,
            description,
            booking_type,
            status,
            start_time,
            end_time,
            staff_id,
            staff_name,
            location,
            max_capacity,
            current_bookings,
            class_session_id,
            metadata
        )
        VALUES (
            NEW.organization_id,
            COALESCE((SELECT name FROM programs WHERE id = NEW.program_id), 'Group Class'),
            (SELECT description FROM programs WHERE id = NEW.program_id),
            'group_class',
            'confirmed',
            NEW.start_time,
            NEW.start_time + (NEW.duration_minutes || ' minutes')::interval,
            NEW.instructor_id,
            NEW.instructor_name,
            NEW.location,
            COALESCE(NEW.capacity, NEW.max_capacity),
            NEW.current_bookings,
            NEW.id,
            jsonb_build_object(
                'program_id', NEW.program_id,
                'auto_synced', true,
                'synced_at', NOW()
            )
        )
        ON CONFLICT (class_session_id) 
        DO UPDATE SET
            title = EXCLUDED.title,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            staff_id = EXCLUDED.staff_id,
            staff_name = EXCLUDED.staff_name,
            location = EXCLUDED.location,
            max_capacity = EXCLUDED.max_capacity,
            current_bookings = EXCLUDED.current_bookings,
            updated_at = NOW();
            
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove calendar booking when class is deleted
        DELETE FROM staff_calendar_bookings 
        WHERE class_session_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Add unique constraint for class_session_id to prevent duplicates
ALTER TABLE staff_calendar_bookings 
ADD CONSTRAINT unique_class_session_booking UNIQUE (class_session_id);

-- Create trigger for auto-sync
DROP TRIGGER IF EXISTS sync_class_to_calendar ON class_sessions;
CREATE TRIGGER sync_class_to_calendar
    AFTER INSERT OR UPDATE OR DELETE ON class_sessions
    FOR EACH ROW
    EXECUTE FUNCTION sync_class_session_to_calendar();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_calendar_bookings_updated_at
    BEFORE UPDATE ON staff_calendar_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_calendar_colors_updated_at
    BEFORE UPDATE ON staff_calendar_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE staff_calendar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_calendar_client_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_calendar_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability_templates ENABLE ROW LEVEL SECURITY;

-- Staff calendar bookings policies
CREATE POLICY "Staff can view all bookings in their organization"
    ON staff_calendar_bookings FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can manage their own bookings"
    ON staff_calendar_bookings FOR ALL
    USING (
        staff_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Client bookings policies
CREATE POLICY "Staff can view client bookings in their organization"
    ON staff_calendar_client_bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff_calendar_bookings scb
            WHERE scb.id = calendar_booking_id
            AND scb.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Staff can manage client bookings for their sessions"
    ON staff_calendar_client_bookings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff_calendar_bookings scb
            WHERE scb.id = calendar_booking_id
            AND (
                scb.staff_id = auth.uid() OR
                scb.organization_id IN (
                    SELECT organization_id FROM user_organizations 
                    WHERE user_id = auth.uid() 
                    AND role IN ('owner', 'admin')
                )
            )
        )
    );

-- Color settings policies
CREATE POLICY "Staff can view colors in their organization"
    ON staff_calendar_colors FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage color settings"
    ON staff_calendar_colors FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Availability templates policies
CREATE POLICY "Staff can view availability in their organization"
    ON staff_availability_templates FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can manage their own availability"
    ON staff_availability_templates FOR ALL
    USING (
        staff_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- VIEWS FOR EASIER QUERYING
-- =====================================================

-- Complete calendar view with staff details
CREATE OR REPLACE VIEW staff_calendar_bookings_view AS
SELECT 
    scb.*,
    u.email as staff_email,
    sp.first_name || ' ' || sp.last_name as staff_full_name,
    COALESCE(
        scb.color_hex,
        scc_type.color_hex,
        scc_staff.color_hex,
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
    (
        SELECT COUNT(*) 
        FROM staff_calendar_client_bookings 
        WHERE calendar_booking_id = scb.id 
        AND booking_status != 'cancelled'
    ) as confirmed_client_count
FROM staff_calendar_bookings scb
LEFT JOIN auth.users u ON scb.staff_id = u.id
LEFT JOIN staff_profiles sp ON scb.staff_id = sp.user_id
LEFT JOIN staff_calendar_colors scc_type ON (
    scc_type.organization_id = scb.organization_id 
    AND scc_type.booking_type = scb.booking_type 
    AND scc_type.staff_id IS NULL
)
LEFT JOIN staff_calendar_colors scc_staff ON (
    scc_staff.organization_id = scb.organization_id 
    AND scc_staff.staff_id = scb.staff_id 
    AND scc_staff.booking_type IS NULL
);

-- View for upcoming bookings
CREATE OR REPLACE VIEW upcoming_staff_calendar_bookings AS
SELECT * FROM staff_calendar_bookings_view
WHERE start_time >= NOW()
AND status != 'cancelled'
ORDER BY start_time;

-- View for today's schedule
CREATE OR REPLACE VIEW today_staff_schedule AS
SELECT * FROM staff_calendar_bookings_view
WHERE DATE(start_time) = CURRENT_DATE
AND status != 'cancelled'
ORDER BY start_time;

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default color schemes for booking types
INSERT INTO staff_calendar_colors (organization_id, booking_type, color_hex, label, is_default)
SELECT 
    o.id,
    bt.booking_type,
    bt.color,
    bt.label,
    true
FROM organizations o
CROSS JOIN (
    VALUES 
        ('pt_session_121'::booking_type, '#3B82F6', '1-2-1 PT Session'),
        ('group_class'::booking_type, '#10B981', 'Group Class'),
        ('gym_floor_time'::booking_type, '#F59E0B', 'Gym Floor Time'),
        ('staff_meeting'::booking_type, '#EF4444', 'Staff Meeting'),
        ('consultation'::booking_type, '#8B5CF6', 'Consultation'),
        ('equipment_maintenance'::booking_type, '#6B7280', 'Maintenance'),
        ('facility_cleaning'::booking_type, '#06B6D4', 'Cleaning'),
        ('private_event'::booking_type, '#EC4899', 'Private Event'),
        ('break_time'::booking_type, '#84CC16', 'Break'),
        ('training_session'::booking_type, '#F97316', 'Training')
) AS bt(booking_type, color, label)
ON CONFLICT (organization_id, booking_type, staff_id) DO NOTHING;

-- Create default availability templates for existing staff
INSERT INTO staff_availability_templates (organization_id, staff_id, day_of_week, start_time, end_time)
SELECT 
    uo.organization_id,
    uo.user_id,
    day_num,
    '09:00'::time,
    '17:00'::time
FROM user_organizations uo
CROSS JOIN generate_series(1, 5) AS day_num -- Monday to Friday
WHERE uo.role IN ('owner', 'admin', 'staff')
ON CONFLICT (organization_id, staff_id, day_of_week, start_time) DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT ALL ON staff_calendar_bookings TO authenticated;
GRANT ALL ON staff_calendar_client_bookings TO authenticated;
GRANT ALL ON staff_calendar_colors TO authenticated;
GRANT ALL ON staff_availability_templates TO authenticated;
GRANT SELECT ON staff_calendar_bookings_view TO authenticated;
GRANT SELECT ON upcoming_staff_calendar_bookings TO authenticated;
GRANT SELECT ON today_staff_schedule TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
INSERT INTO migration_logs (migration_name, status, details)
VALUES (
    '20250913_shared_staff_calendar',
    'completed',
    jsonb_build_object(
        'tables_created', ARRAY[
            'staff_calendar_bookings',
            'staff_calendar_client_bookings',
            'staff_calendar_colors',
            'staff_availability_templates'
        ],
        'functions_created', ARRAY[
            'check_staff_calendar_conflicts',
            'get_staff_availability',
            'sync_class_session_to_calendar'
        ],
        'views_created', ARRAY[
            'staff_calendar_bookings_view',
            'upcoming_staff_calendar_bookings',
            'today_staff_schedule'
        ],
        'timestamp', NOW()
    )
) ON CONFLICT DO NOTHING;

-- Enable realtime for calendar updates
ALTER PUBLICATION supabase_realtime ADD TABLE staff_calendar_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_calendar_client_bookings;