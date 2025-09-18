-- =============================================
-- ATTENDANCES REPORTING SYSTEM
-- Migration: 20250917_attendances_reporting_system
-- Creates comprehensive schema for "All Attendances" reporting
-- Works with existing tables: clients, class_schedules, class_bookings, etc.
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. CREATE ENUM TYPES
-- =============================================

-- Booking status enum (if not already exists)
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('registered', 'attended', 'late_cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Booking method enum
DO $$ BEGIN
    CREATE TYPE booking_method AS ENUM ('membership', 'drop_in', 'free', 'package');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Booking source enum
DO $$ BEGIN
    CREATE TYPE booking_source AS ENUM ('web', 'kiosk', 'mobile_app', 'staff', 'api');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 2. CREATE VENUES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    capacity INTEGER,
    amenities TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_venues_organization_id ON venues(organization_id);
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(organization_id, name);

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. CREATE INSTRUCTORS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    bio TEXT,
    specializations TEXT[],
    certifications TEXT[],
    hourly_rate_pennies INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_instructors_organization_id ON instructors(organization_id);
CREATE INDEX IF NOT EXISTS idx_instructors_user_id ON instructors(user_id);
CREATE INDEX IF NOT EXISTS idx_instructors_active ON instructors(organization_id, is_active);

-- Enable RLS
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. ENHANCE CLASS_TYPES TABLE
-- =============================================

-- Add duration_min column to existing class_types table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'class_types' AND column_name = 'duration_min'
    ) THEN
        ALTER TABLE class_types ADD COLUMN duration_min INTEGER DEFAULT 60;
    END IF;
    
    -- Ensure organization_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'class_types' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE class_types ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    -- Add metadata column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'class_types' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE class_types ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add indexes for class_types
CREATE INDEX IF NOT EXISTS idx_class_types_organization_id ON class_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_class_types_duration ON class_types(duration_min);

-- =============================================
-- 5. ENHANCE CLASSES TABLE (sessions)
-- =============================================

-- Create enhanced classes table that references the existing structures
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    class_type_id UUID REFERENCES class_types(id) ON DELETE SET NULL,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'UTC',
    instructor_ids UUID[] DEFAULT '{}', -- Array of instructor IDs
    max_capacity INTEGER DEFAULT 20,
    price_pennies INTEGER DEFAULT 0,
    room_location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for classes
CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_classes_class_type_id ON classes(class_type_id);
CREATE INDEX IF NOT EXISTS idx_classes_venue_id ON classes(venue_id);
CREATE INDEX IF NOT EXISTS idx_classes_start_at ON classes(organization_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_classes_instructor_ids ON classes USING GIN(instructor_ids);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(organization_id, status);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. CREATE MEMBERSHIPS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_pennies INTEGER DEFAULT 0,
    billing_period VARCHAR(20) DEFAULT 'monthly' CHECK (billing_period IN ('weekly', 'monthly', 'quarterly', 'annually')),
    class_limit INTEGER, -- NULL means unlimited
    features TEXT[],
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for memberships
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(organization_id, is_active);

-- Enable RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. ENHANCE CUSTOMER_MEMBERSHIPS TABLE
-- =============================================

-- Ensure customer_memberships table has all needed columns
DO $$
BEGIN
    -- Add membership_id reference if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_memberships' AND column_name = 'membership_id'
    ) THEN
        ALTER TABLE customer_memberships ADD COLUMN membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL;
    END IF;
    
    -- Add active boolean if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_memberships' AND column_name = 'active'
    ) THEN
        ALTER TABLE customer_memberships ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add started_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_memberships' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE customer_memberships ADD COLUMN started_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add ended_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_memberships' AND column_name = 'ended_at'
    ) THEN
        ALTER TABLE customer_memberships ADD COLUMN ended_at TIMESTAMPTZ;
    END IF;
    
    -- Ensure organization_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_memberships' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE customer_memberships ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for customer_memberships
CREATE INDEX IF NOT EXISTS idx_customer_memberships_membership_id ON customer_memberships(membership_id);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_active ON customer_memberships(organization_id, active);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_dates ON customer_memberships(started_at, ended_at);

-- =============================================
-- 8. CREATE ENHANCED BOOKINGS TABLE
-- =============================================

-- Create the main bookings table for attendance tracking
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- Using existing clients table
    status booking_status DEFAULT 'registered',
    booking_method booking_method DEFAULT 'membership',
    booking_source booking_source DEFAULT 'web',
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    payment_amount_pennies INTEGER DEFAULT 0,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for bookings performance
CREATE INDEX IF NOT EXISTS idx_bookings_organization_class ON bookings(organization_id, class_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_method ON bookings(organization_id, booking_method);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. CREATE RLS POLICIES
-- =============================================

-- Venues policies
CREATE POLICY "Users can view venues in their organization" ON venues
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage venues in their organization" ON venues
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Instructors policies
CREATE POLICY "Users can view instructors in their organization" ON instructors
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage instructors in their organization" ON instructors
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Classes policies
CREATE POLICY "Users can view classes in their organization" ON classes
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage classes in their organization" ON classes
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Memberships policies
CREATE POLICY "Users can view memberships in their organization" ON memberships
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage memberships in their organization" ON memberships
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Bookings policies
CREATE POLICY "Users can view bookings in their organization" ON bookings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage bookings in their organization" ON bookings
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- 10. CREATE ATTENDANCE REPORTING VIEW
-- =============================================

CREATE OR REPLACE VIEW all_attendances AS
SELECT 
    b.id as booking_id,
    b.organization_id,
    
    -- Class information
    c.id as class_id,
    c.start_at as class_start_at,
    c.end_at as class_end_at,
    c.timezone as class_timezone,
    c.room_location,
    
    -- Class type information
    ct.name as class_type_name,
    ct.duration_min,
    
    -- Venue information
    v.id as venue_id,
    v.name as venue_name,
    
    -- Instructor information (from instructor_ids array)
    c.instructor_ids,
    
    -- Customer/Client information
    cl.id as customer_id,
    cl.first_name,
    cl.last_name,
    cl.email,
    cl.phone,
    
    -- Membership information
    cm.membership_id,
    m.name as membership_name,
    cm.active as membership_active,
    
    -- Booking details
    b.status as attendance_status,
    b.booking_method,
    b.booking_source,
    b.checked_in_at,
    b.checked_out_at,
    b.payment_amount_pennies,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    
    -- Calculated fields
    CASE 
        WHEN b.status = 'attended' THEN true 
        ELSE false 
    END as attended,
    
    CASE 
        WHEN b.checked_in_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (b.checked_in_at - c.start_at))/60
        ELSE NULL 
    END as minutes_late,
    
    CASE 
        WHEN b.status = 'attended' AND b.checked_in_at > c.start_at THEN true
        ELSE false 
    END as was_late

FROM bookings b
LEFT JOIN classes c ON b.class_id = c.id
LEFT JOIN class_types ct ON c.class_type_id = ct.id
LEFT JOIN venues v ON c.venue_id = v.id
LEFT JOIN clients cl ON b.customer_id = cl.id
LEFT JOIN customer_memberships cm ON (
    cm.client_id = cl.id 
    AND cm.organization_id = b.organization_id 
    AND cm.active = true
)
LEFT JOIN memberships m ON cm.membership_id = m.id
WHERE b.organization_id IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON all_attendances TO authenticated;

-- =============================================
-- 11. CREATE HELPER FUNCTIONS
-- =============================================

-- Function to get attendance stats for a date range
CREATE OR REPLACE FUNCTION get_attendance_stats(
    org_id UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_bookings BIGINT,
    total_attended BIGINT,
    total_no_shows BIGINT,
    total_cancelled BIGINT,
    attendance_rate NUMERIC,
    avg_class_size NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'attended') as total_attended,
        COUNT(*) FILTER (WHERE status = 'no_show') as total_no_shows,
        COUNT(*) FILTER (WHERE status = 'late_cancelled') as total_cancelled,
        ROUND(
            (COUNT(*) FILTER (WHERE status = 'attended')::NUMERIC / 
             NULLIF(COUNT(*), 0) * 100), 2
        ) as attendance_rate,
        ROUND(AVG(class_bookings.bookings_count), 1) as avg_class_size
    FROM all_attendances a
    LEFT JOIN (
        SELECT 
            class_id, 
            COUNT(*) as bookings_count
        FROM all_attendances 
        WHERE organization_id = org_id
        AND DATE(class_start_at) BETWEEN start_date AND end_date
        GROUP BY class_id
    ) class_bookings ON a.class_id = class_bookings.class_id
    WHERE a.organization_id = org_id
    AND DATE(a.class_start_at) BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_attendance_stats TO authenticated;

-- =============================================
-- 12. GRANT PERMISSIONS
-- =============================================

-- Grant permissions on new tables
GRANT ALL ON venues TO authenticated;
GRANT ALL ON instructors TO authenticated;
GRANT ALL ON classes TO authenticated;
GRANT ALL ON memberships TO authenticated;
GRANT ALL ON bookings TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- 13. ADD HELPFUL COMMENTS
-- =============================================

COMMENT ON TABLE venues IS 'Physical locations where classes take place';
COMMENT ON TABLE instructors IS 'Instructors who can teach classes';
COMMENT ON TABLE classes IS 'Individual class sessions with specific date/time';
COMMENT ON TABLE memberships IS 'Membership plan definitions';
COMMENT ON TABLE bookings IS 'Individual class bookings and attendance records';
COMMENT ON VIEW all_attendances IS 'Comprehensive view of all class attendances with related data';

COMMENT ON COLUMN classes.instructor_ids IS 'Array of instructor IDs for team-taught classes';
COMMENT ON COLUMN bookings.status IS 'Attendance status: registered, attended, late_cancelled, no_show';
COMMENT ON COLUMN bookings.booking_method IS 'How the booking was paid: membership, drop_in, free, package';
COMMENT ON COLUMN bookings.booking_source IS 'Where the booking originated: web, kiosk, mobile_app, staff, api';

-- =============================================
-- 14. CREATE SAMPLE DATA (OPTIONAL)
-- =============================================

-- Insert sample venue for testing (only if no venues exist)
INSERT INTO venues (organization_id, name, address, capacity)
SELECT 
    o.id,
    'Main Studio',
    '123 Fitness Street, Gym City',
    30
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE organization_id = o.id)
LIMIT 1;

-- Insert sample membership plan
INSERT INTO memberships (organization_id, name, description, price_pennies, class_limit)
SELECT 
    o.id,
    'Unlimited Monthly',
    'Unlimited classes per month',
    9999, -- $99.99
    NULL -- unlimited
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM memberships WHERE organization_id = o.id)
LIMIT 1;

-- =============================================
-- END MIGRATION
-- =============================================