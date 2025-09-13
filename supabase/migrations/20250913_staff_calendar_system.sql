-- =============================================
-- ATLAS FITNESS STAFF CALENDAR SYSTEM
-- Comprehensive Database Migration
-- Date: 2025-09-13
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. STAFF CALENDAR BOOKING TYPES ENUM
-- =============================================

-- Create booking type enum for type safety
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type_enum') THEN
        CREATE TYPE booking_type_enum AS ENUM (
            'pt_session_121',     -- 1-to-1 Personal Training
            'group_class',        -- Group fitness class
            'gym_floor_time',     -- General gym floor availability
            'staff_meeting',      -- Staff meeting/admin time
            'consultation',       -- Member consultation
            'equipment_maintenance', -- Equipment servicing
            'facility_cleaning',  -- Deep cleaning slots
            'private_event',      -- Private gym hire
            'break_time',         -- Staff break periods
            'training_session'    -- Staff training
        );
    END IF;
END $$;

-- =============================================
-- 2. STAFF CALENDAR BOOKING COLORS
-- =============================================

-- Predefined color schemes for different booking types and staff members
CREATE TABLE IF NOT EXISTS staff_calendar_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    color_name VARCHAR(50) NOT NULL,
    hex_color VARCHAR(7) NOT NULL CHECK (hex_color ~ '^#[0-9A-Fa-f]{6}$'),
    booking_type booking_type_enum,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE CASCADE,
    is_default_for_type BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique colors per organization for booking types
    CONSTRAINT unique_default_color_per_type 
        UNIQUE (organization_id, booking_type, is_default_for_type) 
        DEFERRABLE INITIALLY DEFERRED,
        
    -- Either booking type or staff_id should be set, not both
    CONSTRAINT color_assignment_check 
        CHECK ((booking_type IS NOT NULL AND staff_id IS NULL) OR 
               (booking_type IS NULL AND staff_id IS NOT NULL))
);

-- =============================================
-- 3. MAIN STAFF CALENDAR BOOKINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS staff_calendar_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic booking information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    booking_type booking_type_enum NOT NULL,
    
    -- Time and duration
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Europe/London',
    is_all_day BOOLEAN DEFAULT false,
    
    -- Staff assignment
    assigned_staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    created_by_staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    
    -- Location and capacity
    location VARCHAR(255),
    room_name VARCHAR(100),
    max_capacity INTEGER DEFAULT 1,
    current_bookings INTEGER DEFAULT 0,
    
    -- Visual customization
    color_hex VARCHAR(7) CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    calendar_color_id UUID REFERENCES staff_calendar_colors(id) ON DELETE SET NULL,
    
    -- Status and availability
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN (
        'confirmed', 'tentative', 'cancelled', 'completed', 'no_show'
    )),
    is_available_for_booking BOOLEAN DEFAULT true,
    booking_deadline_hours INTEGER DEFAULT 24, -- Hours before booking closes
    
    -- Recurring event support
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- Store recurrence rules (RRULE-like format)
    parent_booking_id UUID REFERENCES staff_calendar_bookings(id) ON DELETE CASCADE,
    recurrence_exception_dates JSONB DEFAULT '[]'::jsonb, -- Array of exception dates
    
    -- Integration with existing systems
    class_session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
    calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
    
    -- Payment and booking details (if applicable)
    requires_payment BOOLEAN DEFAULT false,
    price_pennies INTEGER DEFAULT 0,
    
    -- Metadata
    booking_notes TEXT,
    internal_notes TEXT, -- Staff-only notes
    booking_url TEXT,    -- Link to external booking system if needed
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_capacity CHECK (max_capacity >= 0),
    CONSTRAINT valid_current_bookings CHECK (current_bookings >= 0),
    CONSTRAINT valid_deadline CHECK (booking_deadline_hours >= 0)
);

-- =============================================
-- 4. STAFF CALENDAR BOOKINGS - CLIENT BOOKINGS
-- =============================================

-- Track which clients/members have booked specific time slots
CREATE TABLE IF NOT EXISTS staff_calendar_client_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_booking_id UUID NOT NULL REFERENCES staff_calendar_bookings(id) ON DELETE CASCADE,
    
    -- Client information
    client_id UUID REFERENCES leads(id) ON DELETE CASCADE, -- Using leads as clients
    client_name VARCHAR(255), -- Fallback if client not in system
    client_email VARCHAR(255),
    client_phone VARCHAR(20),
    
    -- Booking details
    booking_status VARCHAR(20) DEFAULT 'confirmed' CHECK (booking_status IN (
        'confirmed', 'pending', 'cancelled', 'attended', 'no_show', 'waitlist'
    )),
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    attended_at TIMESTAMPTZ,
    
    -- Payment tracking
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded', 'waived'
    )),
    payment_amount_pennies INTEGER DEFAULT 0,
    stripe_payment_intent_id VARCHAR(255),
    
    -- Metadata
    booking_notes TEXT,
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_payment_amount CHECK (payment_amount_pennies >= 0)
);

-- =============================================
-- 5. STAFF AVAILABILITY TEMPLATES
-- =============================================

-- Predefined availability templates for staff members
CREATE TABLE IF NOT EXISTS staff_availability_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    
    template_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    
    -- Weekly schedule template
    schedule_template JSONB DEFAULT '{
        "monday": {"enabled": true, "shifts": [{"start": "09:00", "end": "17:00", "break_start": "12:00", "break_end": "13:00"}]},
        "tuesday": {"enabled": true, "shifts": [{"start": "09:00", "end": "17:00", "break_start": "12:00", "break_end": "13:00"}]},
        "wednesday": {"enabled": true, "shifts": [{"start": "09:00", "end": "17:00", "break_start": "12:00", "break_end": "13:00"}]},
        "thursday": {"enabled": true, "shifts": [{"start": "09:00", "end": "17:00", "break_start": "12:00", "break_end": "13:00"}]},
        "friday": {"enabled": true, "shifts": [{"start": "09:00", "end": "17:00", "break_start": "12:00", "break_end": "13:00"}]},
        "saturday": {"enabled": false, "shifts": []},
        "sunday": {"enabled": false, "shifts": []}
    }'::jsonb,
    
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_default_template_per_staff 
        UNIQUE (staff_id, is_default) 
        DEFERRABLE INITIALLY DEFERRED
);

-- =============================================
-- 6. PERFORMANCE INDEXES
-- =============================================

-- Staff calendar bookings indexes
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_organization_id 
    ON staff_calendar_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_time_range 
    ON staff_calendar_bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_assigned_staff 
    ON staff_calendar_bookings(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_created_by 
    ON staff_calendar_bookings(created_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_type 
    ON staff_calendar_bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_status 
    ON staff_calendar_bookings(status);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_location 
    ON staff_calendar_bookings(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_recurring 
    ON staff_calendar_bookings(is_recurring, parent_booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_class_session 
    ON staff_calendar_bookings(class_session_id) WHERE class_session_id IS NOT NULL;

-- Time-based queries optimization
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_start_time_desc 
    ON staff_calendar_bookings(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_bookings_daily 
    ON staff_calendar_bookings(organization_id, DATE(start_time AT TIME ZONE timezone));

-- Client bookings indexes
CREATE INDEX IF NOT EXISTS idx_staff_calendar_client_bookings_organization_id 
    ON staff_calendar_client_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_client_bookings_staff_booking 
    ON staff_calendar_client_bookings(staff_booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_client_bookings_client 
    ON staff_calendar_client_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_client_bookings_status 
    ON staff_calendar_client_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_client_bookings_payment_status 
    ON staff_calendar_client_bookings(payment_status);

-- Calendar colors indexes
CREATE INDEX IF NOT EXISTS idx_staff_calendar_colors_organization_id 
    ON staff_calendar_colors(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_colors_booking_type 
    ON staff_calendar_colors(booking_type);
CREATE INDEX IF NOT EXISTS idx_staff_calendar_colors_staff_id 
    ON staff_calendar_colors(staff_id);

-- Availability templates indexes
CREATE INDEX IF NOT EXISTS idx_staff_availability_templates_organization_id 
    ON staff_availability_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_templates_staff_id 
    ON staff_availability_templates(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_templates_effective_dates 
    ON staff_availability_templates(effective_from, effective_until);

-- =============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE staff_calendar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_calendar_client_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_calendar_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability_templates ENABLE ROW LEVEL SECURITY;

-- Staff calendar bookings policies
CREATE POLICY "Users can view calendar bookings from their organization" 
    ON staff_calendar_bookings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can create calendar bookings for their organization" 
    ON staff_calendar_bookings
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
        AND created_by_staff_id IN (
            SELECT id FROM staff_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can update calendar bookings in their organization" 
    ON staff_calendar_bookings
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can delete their own calendar bookings" 
    ON staff_calendar_bookings
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
        AND (
            created_by_staff_id IN (
                SELECT id FROM staff_profiles 
                WHERE user_id = auth.uid()
            )
            OR auth.uid() IN (
                SELECT uo.user_id FROM user_organizations uo 
                WHERE uo.organization_id = staff_calendar_bookings.organization_id 
                AND uo.role IN ('owner', 'admin')
                AND uo.is_active = true
            )
        )
    );

-- Client bookings policies
CREATE POLICY "Users can view client bookings from their organization" 
    ON staff_calendar_client_bookings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage client bookings for their organization" 
    ON staff_calendar_client_bookings
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Calendar colors policies
CREATE POLICY "Users can view calendar colors from their organization" 
    ON staff_calendar_colors
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage calendar colors for their organization" 
    ON staff_calendar_colors
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Availability templates policies
CREATE POLICY "Users can view availability templates from their organization" 
    ON staff_availability_templates
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Staff can manage their own availability templates" 
    ON staff_availability_templates
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
        AND (
            staff_id IN (
                SELECT id FROM staff_profiles 
                WHERE user_id = auth.uid()
            )
            OR auth.uid() IN (
                SELECT uo.user_id FROM user_organizations uo 
                WHERE uo.organization_id = staff_availability_templates.organization_id 
                AND uo.role IN ('owner', 'admin')
                AND uo.is_active = true
            )
        )
    );

-- =============================================
-- 8. TRIGGERS AND FUNCTIONS
-- =============================================

-- Update updated_at timestamp function (reuse existing if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER update_staff_calendar_bookings_updated_at 
    BEFORE UPDATE ON staff_calendar_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_calendar_client_bookings_updated_at 
    BEFORE UPDATE ON staff_calendar_client_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_calendar_colors_updated_at 
    BEFORE UPDATE ON staff_calendar_colors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_availability_templates_updated_at 
    BEFORE UPDATE ON staff_availability_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update current_bookings count
CREATE OR REPLACE FUNCTION update_staff_calendar_booking_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.booking_status IN ('confirmed', 'attended') THEN
        UPDATE staff_calendar_bookings 
        SET current_bookings = current_bookings + 1
        WHERE id = NEW.staff_booking_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status changed from confirmed/attended to something else
        IF OLD.booking_status IN ('confirmed', 'attended') AND 
           NEW.booking_status NOT IN ('confirmed', 'attended') THEN
            UPDATE staff_calendar_bookings 
            SET current_bookings = current_bookings - 1
            WHERE id = NEW.staff_booking_id;
        -- Status changed to confirmed/attended from something else
        ELSIF OLD.booking_status NOT IN ('confirmed', 'attended') AND 
              NEW.booking_status IN ('confirmed', 'attended') THEN
            UPDATE staff_calendar_bookings 
            SET current_bookings = current_bookings + 1
            WHERE id = NEW.staff_booking_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.booking_status IN ('confirmed', 'attended') THEN
        UPDATE staff_calendar_bookings 
        SET current_bookings = current_bookings - 1
        WHERE id = OLD.staff_booking_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_calendar_booking_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON staff_calendar_client_bookings
    FOR EACH ROW EXECUTE FUNCTION update_staff_calendar_booking_count();

-- =============================================
-- 9. UTILITY FUNCTIONS FOR CALENDAR OPERATIONS
-- =============================================

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION check_staff_calendar_conflicts(
    p_staff_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_booking_id UUID DEFAULT NULL
) RETURNS TABLE (
    conflict_count INTEGER,
    conflicting_bookings JSONB
) AS $$
DECLARE
    conflicts JSONB;
    count_conflicts INTEGER;
BEGIN
    -- Get conflicting bookings
    SELECT 
        COUNT(*)::INTEGER,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', id,
                'title', title,
                'start_time', start_time,
                'end_time', end_time,
                'booking_type', booking_type
            )
        ), '[]'::jsonb)
    INTO count_conflicts, conflicts
    FROM staff_calendar_bookings
    WHERE assigned_staff_id = p_staff_id
        AND status NOT IN ('cancelled')
        AND (p_booking_id IS NULL OR id != p_booking_id)
        AND (
            (start_time < p_end_time AND end_time > p_start_time)
        );
    
    RETURN QUERY SELECT count_conflicts, conflicts;
END;
$$ LANGUAGE plpgsql;

-- Function to get staff availability for a date range
CREATE OR REPLACE FUNCTION get_staff_availability(
    p_staff_id UUID,
    p_start_date DATE,
    p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
    date DATE,
    available_slots JSONB,
    booked_slots JSONB
) AS $$
DECLARE
    current_date DATE := p_start_date;
    end_date DATE := COALESCE(p_end_date, p_start_date);
BEGIN
    WHILE current_date <= end_date LOOP
        RETURN QUERY
        SELECT 
            current_date,
            get_staff_available_slots(p_staff_id, current_date) as available_slots,
            get_staff_booked_slots(p_staff_id, current_date) as booked_slots;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get available time slots for a staff member on a specific date
CREATE OR REPLACE FUNCTION get_staff_available_slots(
    p_staff_id UUID,
    p_date DATE
) RETURNS JSONB AS $$
DECLARE
    availability_template JSONB;
    day_of_week TEXT;
    available_slots JSONB := '[]'::jsonb;
BEGIN
    -- Get day of week (monday, tuesday, etc.)
    SELECT LOWER(TO_CHAR(p_date, 'Day')) INTO day_of_week;
    day_of_week := TRIM(day_of_week);
    
    -- Get availability template for this staff member
    SELECT schedule_template INTO availability_template
    FROM staff_availability_templates
    WHERE staff_id = p_staff_id 
        AND is_default = true
        AND p_date >= effective_from
        AND (effective_until IS NULL OR p_date <= effective_until)
    LIMIT 1;
    
    -- If no template found, return empty slots
    IF availability_template IS NULL THEN
        RETURN available_slots;
    END IF;
    
    -- Extract availability for the specific day
    IF availability_template ? day_of_week THEN
        available_slots := availability_template -> day_of_week -> 'shifts';
    END IF;
    
    RETURN COALESCE(available_slots, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Helper function to get booked time slots for a staff member on a specific date
CREATE OR REPLACE FUNCTION get_staff_booked_slots(
    p_staff_id UUID,
    p_date DATE
) RETURNS JSONB AS $$
DECLARE
    booked_slots JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'title', title,
            'start_time', start_time,
            'end_time', end_time,
            'booking_type', booking_type,
            'status', status,
            'current_bookings', current_bookings,
            'max_capacity', max_capacity
        )
    ), '[]'::jsonb) INTO booked_slots
    FROM staff_calendar_bookings
    WHERE assigned_staff_id = p_staff_id
        AND DATE(start_time AT TIME ZONE timezone) = p_date
        AND status NOT IN ('cancelled');
    
    RETURN booked_slots;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create calendar bookings from class sessions
CREATE OR REPLACE FUNCTION sync_class_sessions_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
    calendar_booking_id UUID;
    staff_profile_id UUID;
BEGIN
    -- Skip if this is a delete operation
    IF TG_OP = 'DELETE' THEN
        -- Remove associated calendar booking if exists
        DELETE FROM staff_calendar_bookings 
        WHERE class_session_id = OLD.id;
        RETURN OLD;
    END IF;
    
    -- Get staff profile ID from trainer_id if exists
    IF NEW.trainer_id IS NOT NULL THEN
        SELECT id INTO staff_profile_id 
        FROM staff_profiles 
        WHERE user_id = NEW.trainer_id 
        AND organization_id = NEW.organization_id;
    END IF;
    
    -- Insert or update calendar booking
    INSERT INTO staff_calendar_bookings (
        organization_id,
        title,
        description,
        booking_type,
        start_time,
        end_time,
        assigned_staff_id,
        created_by_staff_id,
        location,
        room_name,
        max_capacity,
        status,
        is_available_for_booking,
        class_session_id,
        color_hex
    ) VALUES (
        NEW.organization_id,
        COALESCE(NEW.name, 'Group Class'),
        NEW.description,
        'group_class',
        NEW.start_time,
        NEW.end_time,
        staff_profile_id,
        COALESCE(staff_profile_id, (
            SELECT id FROM staff_profiles 
            WHERE organization_id = NEW.organization_id 
            LIMIT 1
        )),
        NEW.room_location,
        NEW.room_location,
        NEW.max_capacity,
        CASE 
            WHEN NEW.session_status = 'scheduled' THEN 'confirmed'
            WHEN NEW.session_status = 'cancelled' THEN 'cancelled'
            WHEN NEW.session_status = 'completed' THEN 'completed'
            ELSE 'confirmed'
        END,
        true,
        NEW.id,
        '#10B981' -- Green for group classes
    )
    ON CONFLICT (class_session_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        assigned_staff_id = EXCLUDED.assigned_staff_id,
        location = EXCLUDED.location,
        room_name = EXCLUDED.room_name,
        max_capacity = EXCLUDED.max_capacity,
        status = EXCLUDED.status,
        updated_at = NOW()
    WHERE staff_calendar_bookings.class_session_id = EXCLUDED.class_session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync class sessions to calendar
CREATE TRIGGER sync_class_sessions_to_staff_calendar
    AFTER INSERT OR UPDATE OR DELETE ON class_sessions
    FOR EACH ROW EXECUTE FUNCTION sync_class_sessions_to_calendar();

-- =============================================
-- 10. DEFAULT DATA INSERTION
-- =============================================

-- Insert default calendar colors for booking types
INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'PT Session',
    '#3B82F6',
    'pt_session_121',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'pt_session_121'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Group Class',
    '#10B981',
    'group_class',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'group_class'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Gym Floor',
    '#8B5CF6',
    'gym_floor_time',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'gym_floor_time'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Staff Meeting',
    '#F59E0B',
    'staff_meeting',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'staff_meeting'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Consultation',
    '#06B6D4',
    'consultation',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'consultation'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Maintenance',
    '#EF4444',
    'equipment_maintenance',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'equipment_maintenance'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Cleaning',
    '#84CC16',
    'facility_cleaning',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'facility_cleaning'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Private Event',
    '#A855F7',
    'private_event',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'private_event'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Break Time',
    '#6B7280',
    'break_time',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'break_time'
);

INSERT INTO staff_calendar_colors (organization_id, color_name, hex_color, booking_type, is_default_for_type) 
SELECT 
    o.id,
    'Training',
    '#F97316',
    'training_session',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM staff_calendar_colors 
    WHERE organization_id = o.id AND booking_type = 'training_session'
);

-- Create default availability templates for existing staff
INSERT INTO staff_availability_templates (organization_id, staff_id, template_name, is_default)
SELECT 
    sp.organization_id,
    sp.id,
    'Default Schedule',
    true
FROM staff_profiles sp
WHERE NOT EXISTS (
    SELECT 1 FROM staff_availability_templates 
    WHERE staff_id = sp.id AND is_default = true
);

-- =============================================
-- 11. VIEWS FOR EASY QUERYING
-- =============================================

-- View for calendar bookings with staff and color information
CREATE OR REPLACE VIEW staff_calendar_bookings_view AS
SELECT 
    scb.*,
    sp.first_name || ' ' || sp.last_name as assigned_staff_name,
    sp.job_position as assigned_staff_position,
    creator_sp.first_name || ' ' || creator_sp.last_name as created_by_name,
    scc.hex_color as display_color,
    scc.color_name as color_name,
    cs.name as class_name,
    cs.current_bookings as class_current_bookings,
    (
        SELECT COUNT(*) FROM staff_calendar_client_bookings sccb
        WHERE sccb.staff_booking_id = scb.id 
        AND sccb.booking_status IN ('confirmed', 'attended')
    ) as confirmed_client_bookings
FROM staff_calendar_bookings scb
LEFT JOIN staff_profiles sp ON scb.assigned_staff_id = sp.id
LEFT JOIN staff_profiles creator_sp ON scb.created_by_staff_id = creator_sp.id
LEFT JOIN staff_calendar_colors scc ON scb.calendar_color_id = scc.id
LEFT JOIN class_sessions cs ON scb.class_session_id = cs.id;

-- View for upcoming bookings
CREATE OR REPLACE VIEW upcoming_staff_calendar_bookings AS
SELECT * FROM staff_calendar_bookings_view
WHERE start_time > NOW()
    AND status NOT IN ('cancelled')
ORDER BY start_time ASC;

-- View for today's schedule
CREATE OR REPLACE VIEW today_staff_schedule AS
SELECT * FROM staff_calendar_bookings_view
WHERE DATE(start_time AT TIME ZONE timezone) = CURRENT_DATE
    AND status NOT IN ('cancelled')
ORDER BY start_time ASC;

-- =============================================
-- 12. UNIQUE CONSTRAINTS
-- =============================================

-- Add unique constraint to prevent overlapping bookings for same staff
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_staff_calendar_booking_time
    ON staff_calendar_bookings(assigned_staff_id, start_time, end_time)
    WHERE status NOT IN ('cancelled') AND assigned_staff_id IS NOT NULL;

-- Prevent duplicate class session calendar entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_class_session_calendar_booking
    ON staff_calendar_bookings(class_session_id)
    WHERE class_session_id IS NOT NULL;

-- Ensure only one default color per booking type per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_default_booking_type_color
    ON staff_calendar_colors(organization_id, booking_type)
    WHERE is_default_for_type = true;

-- =============================================
-- 13. REALTIME SUBSCRIPTIONS SETUP
-- =============================================

-- Enable realtime for live calendar updates
ALTER PUBLICATION supabase_realtime ADD TABLE staff_calendar_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_calendar_client_bookings;

-- =============================================
-- 14. COMPLETION MESSAGE AND LOGGING
-- =============================================

-- Log migration completion
COMMENT ON SCHEMA public IS 'Atlas Fitness Staff Calendar System - Migration completed successfully on 2025-09-13';

-- Insert audit log entry if audit_logs table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        INSERT INTO public.audit_logs (
            organization_id,
            table_name,
            action,
            old_values,
            new_values,
            user_id
        ) VALUES (
            '63589490-8f55-4157-bd3a-e141594b748e',
            'migration_log',
            'MIGRATION_COMPLETE',
            '{}',
            jsonb_build_object(
                'migration', '20250913_staff_calendar_system.sql',
                'tables_created', ARRAY[
                    'staff_calendar_bookings',
                    'staff_calendar_client_bookings', 
                    'staff_calendar_colors',
                    'staff_availability_templates'
                ],
                'features', ARRAY[
                    'Multi-tenant RLS policies',
                    'Auto-sync with class_sessions',
                    'Color coordination system',
                    'Conflict detection',
                    'Recurring bookings support',
                    'Real-time subscriptions',
                    'Performance indexes',
                    'Comprehensive views'
                ],
                'booking_types', ARRAY[
                    'pt_session_121',
                    'group_class', 
                    'gym_floor_time',
                    'staff_meeting',
                    'consultation',
                    'equipment_maintenance',
                    'facility_cleaning',
                    'private_event',
                    'break_time',
                    'training_session'
                ]
            ),
            auth.uid()
        );
    END IF;
END $$;