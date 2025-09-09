-- Migration: Client Portal Setup
-- Description: Ensures all necessary tables and data for the client portal to function

-- 1. Ensure clients table has all necessary columns
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS medical_notes TEXT,
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Create class_credits table if not exists
CREATE TABLE IF NOT EXISTS class_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    credits_purchased INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    credits_remaining INTEGER DEFAULT 0,
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create membership_plans table if not exists
CREATE TABLE IF NOT EXISTS membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_pennies INTEGER NOT NULL,
    billing_period TEXT DEFAULT 'monthly',
    monthly_credits INTEGER,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create memberships table if not exists
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    membership_plan_id UUID REFERENCES membership_plans(id),
    status TEXT DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    next_billing_date DATE,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create programs table if not exists (for class types)
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 60,
    capacity INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create organization_locations table if not exists
CREATE TABLE IF NOT EXISTS organization_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create organization_staff table if not exists
CREATE TABLE IF NOT EXISTS organization_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'instructor',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create class_sessions table if not exists
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id),
    location_id UUID REFERENCES organization_locations(id),
    instructor_id UUID REFERENCES organization_staff(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    max_capacity INTEGER DEFAULT 20,
    current_capacity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create bookings table if not exists
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'confirmed',
    booking_date TIMESTAMPTZ DEFAULT NOW(),
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create messages table for coach messaging if not exists
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES organization_staff(id),
    sender_type TEXT CHECK (sender_type IN ('client', 'coach')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create waivers table if not exists
CREATE TABLE IF NOT EXISTS waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    waiver_type TEXT NOT NULL,
    signed_at TIMESTAMPTZ,
    signature_data TEXT,
    document_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Add RLS policies for client access
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can view own data" ON clients;
DROP POLICY IF EXISTS "Clients can update own data" ON clients;
DROP POLICY IF EXISTS "Clients can view own credits" ON class_credits;
DROP POLICY IF EXISTS "Clients can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Public can view membership plans" ON membership_plans;
DROP POLICY IF EXISTS "Public can view class sessions" ON class_sessions;
DROP POLICY IF EXISTS "Clients can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can view own messages" ON messages;
DROP POLICY IF EXISTS "Clients can send messages" ON messages;
DROP POLICY IF EXISTS "Clients can view own waivers" ON waivers;
DROP POLICY IF EXISTS "Public can view programs" ON programs;
DROP POLICY IF EXISTS "Public can view locations" ON organization_locations;
DROP POLICY IF EXISTS "Public can view staff" ON organization_staff;

-- Create RLS policies for clients
CREATE POLICY "Clients can view own data" ON clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Clients can update own data" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Clients can view own credits" ON class_credits
    FOR SELECT USING (
        customer_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Clients can view own memberships" ON memberships
    FOR SELECT USING (
        customer_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Public can view membership plans" ON membership_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view class sessions" ON class_sessions
    FOR SELECT USING (status = 'scheduled');

CREATE POLICY "Clients can view own bookings" ON bookings
    FOR SELECT USING (
        customer_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Clients can create bookings" ON bookings
    FOR INSERT WITH CHECK (
        customer_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Clients can view own messages" ON messages
    FOR SELECT USING (
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Clients can send messages" ON messages
    FOR INSERT WITH CHECK (
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        AND sender_type = 'client'
    );

CREATE POLICY "Clients can view own waivers" ON waivers
    FOR SELECT USING (
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Public can view programs" ON programs
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view locations" ON organization_locations
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view staff" ON organization_staff
    FOR SELECT USING (is_active = true);

-- 13. Insert sample data for testing (only if Sam's account exists)
DO $$
DECLARE
    v_org_id UUID;
    v_client_id UUID;
    v_location_id UUID;
    v_program_id UUID;
    v_instructor_id UUID;
    v_plan_id UUID;
BEGIN
    -- Get Sam's client ID and organization
    SELECT id, organization_id INTO v_client_id, v_org_id
    FROM clients 
    WHERE email = 'sam@atlas-gyms.co.uk'
    LIMIT 1;

    IF v_client_id IS NOT NULL AND v_org_id IS NOT NULL THEN
        -- Create sample location if not exists
        INSERT INTO organization_locations (organization_id, name, address, city, postal_code)
        SELECT v_org_id, 'Harrogate Studio', '123 Main Street', 'Harrogate', 'HG1 2AB'
        WHERE NOT EXISTS (
            SELECT 1 FROM organization_locations 
            WHERE organization_id = v_org_id AND name = 'Harrogate Studio'
        )
        RETURNING id INTO v_location_id;

        -- Create sample instructor if not exists
        INSERT INTO organization_staff (organization_id, name, email, role)
        SELECT v_org_id, 'Sarah Johnson', 'sarah@atlas-gyms.co.uk', 'instructor'
        WHERE NOT EXISTS (
            SELECT 1 FROM organization_staff 
            WHERE organization_id = v_org_id AND name = 'Sarah Johnson'
        )
        RETURNING id INTO v_instructor_id;

        -- Create sample program if not exists
        INSERT INTO programs (organization_id, name, description, duration_minutes)
        SELECT v_org_id, 'HIIT Circuit', 'High-intensity interval training for all fitness levels', 45
        WHERE NOT EXISTS (
            SELECT 1 FROM programs 
            WHERE organization_id = v_org_id AND name = 'HIIT Circuit'
        )
        RETURNING id INTO v_program_id;

        -- Create sample membership plan if not exists
        INSERT INTO membership_plans (organization_id, name, description, price_pennies, monthly_credits)
        SELECT v_org_id, 'Standard Membership', 'Full gym access with 8 classes per month', 4999, 8
        WHERE NOT EXISTS (
            SELECT 1 FROM membership_plans 
            WHERE organization_id = v_org_id AND name = 'Standard Membership'
        )
        RETURNING id INTO v_plan_id;

        -- Create membership for Sam if not exists
        INSERT INTO memberships (customer_id, organization_id, membership_plan_id, status, start_date)
        SELECT v_client_id, v_org_id, v_plan_id, 'active', CURRENT_DATE
        WHERE v_plan_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM memberships 
            WHERE customer_id = v_client_id AND status = 'active'
        );

        -- Create class credits for Sam if not exists
        INSERT INTO class_credits (customer_id, organization_id, credits_purchased, credits_used, credits_remaining)
        SELECT v_client_id, v_org_id, 8, 0, 8
        WHERE NOT EXISTS (
            SELECT 1 FROM class_credits 
            WHERE customer_id = v_client_id
        );

        RAISE NOTICE 'Sample data created successfully for Sam';
    ELSE
        RAISE NOTICE 'Sam account not found, skipping sample data creation';
    END IF;
END $$;

-- 14. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_start_time ON class_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_class_sessions_organization_id ON class_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_customer_id ON memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);