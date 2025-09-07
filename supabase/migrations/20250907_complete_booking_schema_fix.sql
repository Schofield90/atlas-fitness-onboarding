-- Complete fix for all booking system database schema issues
-- This migration fixes all the errors shown in the console logs

-- ============================================
-- 1. Fix class_bookings table - add missing client_id column
-- ============================================
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_client_id ON class_bookings(client_id);

-- ============================================
-- 2. Create customer_class_packages table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS customer_class_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    package_id UUID,
    status VARCHAR(50) DEFAULT 'active',
    classes_remaining INTEGER DEFAULT 0,
    classes_used INTEGER DEFAULT 0,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_customer_or_client CHECK (
        (client_id IS NOT NULL AND customer_id IS NULL) OR 
        (client_id IS NULL AND customer_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_class_packages_client_id ON customer_class_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_class_packages_customer_id ON customer_class_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_class_packages_organization_id ON customer_class_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_class_packages_package_id ON customer_class_packages(package_id);

-- ============================================
-- 3. Create class_packages table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS class_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    classes_included INTEGER NOT NULL,
    price_pennies INTEGER DEFAULT 0,
    organization_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    validity_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_class_packages_organization_id ON class_packages(organization_id);

-- ============================================
-- 4. Fix bookings table relationships
-- ============================================
-- First check if schedules table exists, if not create a basic one
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    location VARCHAR(255),
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add schedule_id column to bookings if it doesn't exist (for backward compatibility)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;

-- ============================================
-- 5. Fix class_schedules table if needed
-- ============================================
CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    instructor_name VARCHAR(255),
    room_location VARCHAR(255),
    max_capacity INTEGER DEFAULT 20,
    price_pennies INTEGER DEFAULT 0,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. Fix class_types table if needed
-- ============================================
CREATE TABLE IF NOT EXISTS class_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50),
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add class_type_id to class_schedules if missing
ALTER TABLE class_schedules 
ADD COLUMN IF NOT EXISTS class_type_id UUID REFERENCES class_types(id) ON DELETE SET NULL;

-- ============================================
-- 7. Fix recurring_bookings table if needed
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    class_schedule_id UUID,
    organization_id UUID,
    frequency VARCHAR(50),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. Add missing columns from earlier migrations
-- ============================================
-- Add classes_used_this_period to customer_memberships if missing
ALTER TABLE customer_memberships 
ADD COLUMN IF NOT EXISTS classes_used_this_period INTEGER DEFAULT 0;

-- Add classes_per_period to membership_plans if missing
ALTER TABLE membership_plans 
ADD COLUMN IF NOT EXISTS classes_per_period INTEGER;

-- Copy existing class_limit values to classes_per_period
UPDATE membership_plans 
SET classes_per_period = class_limit 
WHERE classes_per_period IS NULL AND class_limit IS NOT NULL;

-- ============================================
-- 9. Enable RLS on new tables
-- ============================================
ALTER TABLE customer_class_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. Create RLS policies
-- ============================================
-- Policies for customer_class_packages
CREATE POLICY "Users can view packages in their organization" ON customer_class_packages
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create packages in their organization" ON customer_class_packages
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update packages in their organization" ON customer_class_packages
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Policies for class_packages
CREATE POLICY "Users can view class packages in their organization" ON class_packages
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage class packages in their organization" ON class_packages
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 11. Grant permissions
-- ============================================
GRANT ALL ON customer_class_packages TO authenticated;
GRANT ALL ON class_packages TO authenticated;
GRANT ALL ON class_schedules TO authenticated;
GRANT ALL ON class_types TO authenticated;
GRANT ALL ON recurring_bookings TO authenticated;

-- ============================================
-- 12. Add helpful comments
-- ============================================
COMMENT ON TABLE customer_class_packages IS 'Tracks class packages purchased by customers';
COMMENT ON TABLE class_packages IS 'Defines available class package types';
COMMENT ON COLUMN customer_class_packages.client_id IS 'Reference to client if customer is a client';
COMMENT ON COLUMN customer_class_packages.customer_id IS 'Reference to lead if customer is a lead';
COMMENT ON COLUMN class_bookings.client_id IS 'Reference to client for booking (dual customer support)';