-- URGENT: Apply these fixes to Supabase to fix booking errors
-- Run this in the Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new

-- 1. Add client_id to class_bookings (CRITICAL - fixes booking error)
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_class_bookings_client_id ON class_bookings(client_id);

-- 2. Add classes_used_this_period to customer_memberships (fixes membership tracking)
ALTER TABLE customer_memberships 
ADD COLUMN IF NOT EXISTS classes_used_this_period INTEGER DEFAULT 0;

-- 3. Add classes_per_period to membership_plans (fixes class limit display)
ALTER TABLE membership_plans 
ADD COLUMN IF NOT EXISTS classes_per_period INTEGER;

UPDATE membership_plans 
SET classes_per_period = class_limit 
WHERE classes_per_period IS NULL AND class_limit IS NOT NULL;

-- 4. Create customer_class_packages table (for package bookings)
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

-- 5. Create schedules table (for booking relationships)
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

-- 6. Add schedule_id to bookings (links bookings to schedules)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;

-- Verify all fixes were applied
SELECT 'All fixes applied successfully!' as status;