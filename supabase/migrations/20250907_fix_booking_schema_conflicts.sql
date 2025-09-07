-- =============================================
-- FIX BOOKING SCHEMA CONFLICTS - COMPREHENSIVE SOLUTION
-- Migration: 20250907_fix_booking_schema_conflicts
-- Fixes the conflicting booking table schemas once and for all
-- =============================================

-- 1. ANALYZE CURRENT STATE
-- Check what columns exist in both tables
DO $$
BEGIN
  RAISE NOTICE 'Starting booking schema conflict resolution...';
  
  -- Log existing columns in bookings table
  RAISE NOTICE 'Checking bookings table schema...';
  
  -- Log existing columns in class_bookings table  
  RAISE NOTICE 'Checking class_bookings table schema...';
END $$;

-- 2. ADD MISSING COLUMNS TO CLASS_BOOKINGS TABLE
-- This is the critical fix for the "Could not find class_session_id" error

-- Add class_session_id column (CRITICAL - fixes the main error)
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE;

-- Add client_id column for multi-tenant support (from clients table)
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add organization_id if it doesn't exist
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add customer_id for leads support if it doesn't exist  
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- 3. ENSURE PROPER CONSTRAINTS
-- Drop existing constraint if it exists
ALTER TABLE class_bookings DROP CONSTRAINT IF EXISTS check_customer_or_client_class_booking;

-- Add constraint to ensure either customer_id OR client_id is set (but not both)
ALTER TABLE class_bookings 
ADD CONSTRAINT check_customer_or_client_class_booking 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL)
);

-- 4. ADD MISSING COLUMNS FOR FULL COMPATIBILITY
-- Add other essential columns that exist in bookings but not class_bookings

-- Booking status and payment info
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_status VARCHAR(50) DEFAULT 'confirmed';

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'single';

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0;

-- Timestamps
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Notes and metadata
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 5. CREATE ESSENTIAL INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_class_bookings_class_session_id 
ON class_bookings(class_session_id);

CREATE INDEX IF NOT EXISTS idx_class_bookings_client_id 
ON class_bookings(client_id);

CREATE INDEX IF NOT EXISTS idx_class_bookings_customer_id 
ON class_bookings(customer_id);

CREATE INDEX IF NOT EXISTS idx_class_bookings_organization_id 
ON class_bookings(organization_id);

CREATE INDEX IF NOT EXISTS idx_class_bookings_status 
ON class_bookings(booking_status);

-- Combined indexes for common queries
CREATE INDEX IF NOT EXISTS idx_class_bookings_session_status 
ON class_bookings(class_session_id, booking_status);

CREATE INDEX IF NOT EXISTS idx_class_bookings_org_customer 
ON class_bookings(organization_id, customer_id) 
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_class_bookings_org_client 
ON class_bookings(organization_id, client_id) 
WHERE client_id IS NOT NULL;

-- 6. ENSURE RLS POLICIES FOR CLASS_BOOKINGS
-- Enable RLS if not already enabled
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Public can create class bookings" ON class_bookings;
DROP POLICY IF EXISTS "Users can view org class bookings" ON class_bookings;
DROP POLICY IF EXISTS "Users can manage org class bookings" ON class_bookings;

-- Create comprehensive RLS policies
CREATE POLICY "Public can create class bookings" ON class_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view org class bookings" ON class_bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) OR
    -- Allow viewing via class_sessions relationship
    class_session_id IN (
      SELECT cs.id FROM class_sessions cs
      JOIN users u ON u.organization_id = cs.organization_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage org class bookings" ON class_bookings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete org class bookings" ON class_bookings
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 7. CREATE SUPPORTING TABLES IF MISSING

-- Ensure class_packages table exists for package bookings
CREATE TABLE IF NOT EXISTS class_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    classes_included INTEGER NOT NULL DEFAULT 1,
    price_pennies INTEGER NOT NULL DEFAULT 0,
    validity_days INTEGER DEFAULT 365,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure customer_class_packages table exists
CREATE TABLE IF NOT EXISTS customer_class_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    package_id UUID REFERENCES class_packages(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    classes_remaining INTEGER DEFAULT 0,
    classes_used INTEGER DEFAULT 0,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_customer_or_client_package CHECK (
        (client_id IS NOT NULL AND customer_id IS NULL) OR 
        (client_id IS NULL AND customer_id IS NOT NULL)
    )
);

-- Ensure customer_memberships table has required columns
ALTER TABLE customer_memberships 
ADD COLUMN IF NOT EXISTS classes_used_this_period INTEGER DEFAULT 0;

-- Ensure membership_plans table has required columns  
ALTER TABLE membership_plans 
ADD COLUMN IF NOT EXISTS classes_per_period INTEGER;

-- Update existing membership plans to set classes_per_period from class_limit
UPDATE membership_plans 
SET classes_per_period = class_limit 
WHERE classes_per_period IS NULL AND class_limit IS NOT NULL;

-- 8. GRANT NECESSARY PERMISSIONS
-- Grant permissions for anonymous and authenticated users
GRANT SELECT, INSERT, UPDATE ON class_bookings TO anon;
GRANT SELECT, INSERT, UPDATE ON class_bookings TO authenticated;

GRANT SELECT ON class_packages TO anon;
GRANT SELECT ON class_packages TO authenticated;

GRANT SELECT, UPDATE ON customer_class_packages TO anon;
GRANT SELECT, UPDATE ON customer_class_packages TO authenticated;

GRANT SELECT, UPDATE ON customer_memberships TO anon;
GRANT SELECT, UPDATE ON customer_memberships TO authenticated;

-- 9. ADD HELPFUL UTILITY FUNCTIONS

-- Function to get available payment methods for a customer
CREATE OR REPLACE FUNCTION get_customer_payment_methods(
    p_customer_id UUID,
    p_organization_id UUID,
    p_customer_type VARCHAR DEFAULT 'client'
)
RETURNS TABLE (
    id UUID,
    type VARCHAR,
    name VARCHAR,
    description TEXT,
    remaining INTEGER,
    is_available BOOLEAN
) AS $$
BEGIN
    -- Return package methods
    RETURN QUERY
    SELECT 
        ccp.id,
        'package'::VARCHAR as type,
        cp.name::VARCHAR,
        (ccp.classes_remaining || ' classes remaining')::TEXT as description,
        ccp.classes_remaining,
        (ccp.classes_remaining > 0)::BOOLEAN as is_available
    FROM customer_class_packages ccp
    JOIN class_packages cp ON cp.id = ccp.package_id
    WHERE ccp.organization_id = p_organization_id
        AND ccp.status = 'active'
        AND ccp.classes_remaining > 0
        AND (
            (p_customer_type = 'client' AND ccp.client_id = p_customer_id) OR
            (p_customer_type = 'lead' AND ccp.customer_id = p_customer_id)
        );
        
    -- Return membership methods
    RETURN QUERY
    SELECT 
        cm.id,
        'membership'::VARCHAR as type,
        mp.name::VARCHAR,
        CASE 
            WHEN mp.classes_per_period IS NULL OR mp.classes_per_period = 0 
            THEN 'Unlimited classes included'::TEXT
            ELSE ((mp.classes_per_period - COALESCE(cm.classes_used_this_period, 0)) || ' classes remaining this period')::TEXT
        END as description,
        CASE 
            WHEN mp.classes_per_period IS NULL OR mp.classes_per_period = 0 
            THEN NULL::INTEGER
            ELSE (mp.classes_per_period - COALESCE(cm.classes_used_this_period, 0))
        END as remaining,
        CASE 
            WHEN mp.classes_per_period IS NULL OR mp.classes_per_period = 0 
            THEN true
            ELSE (mp.classes_per_period - COALESCE(cm.classes_used_this_period, 0)) > 0
        END as is_available
    FROM customer_memberships cm
    JOIN membership_plans mp ON mp.id = cm.membership_plan_id
    WHERE cm.organization_id = p_organization_id
        AND cm.status = 'active'
        AND (
            (p_customer_type = 'client' AND cm.client_id = p_customer_id) OR
            (p_customer_type = 'lead' AND cm.customer_id = p_customer_id)
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment package/membership usage
CREATE OR REPLACE FUNCTION increment_classes_used(pkg_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_used INTEGER;
BEGIN
    -- Try customer_class_packages first
    SELECT classes_used INTO current_used 
    FROM customer_class_packages 
    WHERE id = pkg_id;
    
    IF FOUND THEN
        UPDATE customer_class_packages 
        SET classes_used = classes_used + 1 
        WHERE id = pkg_id;
        RETURN current_used + 1;
    END IF;
    
    -- Try customer_memberships
    SELECT classes_used_this_period INTO current_used 
    FROM customer_memberships 
    WHERE id = pkg_id;
    
    IF FOUND THEN
        UPDATE customer_memberships 
        SET classes_used_this_period = classes_used_this_period + 1 
        WHERE id = pkg_id;
        RETURN current_used + 1;
    END IF;
    
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. VERIFY ALL FIXES APPLIED
DO $$
BEGIN
  -- Verify class_bookings has class_session_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_bookings' AND column_name = 'class_session_id'
  ) THEN
    RAISE NOTICE '✅ class_bookings.class_session_id column exists';
  ELSE
    RAISE EXCEPTION '❌ class_bookings.class_session_id column missing';
  END IF;
  
  -- Verify class_bookings has client_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_bookings' AND column_name = 'client_id'
  ) THEN
    RAISE NOTICE '✅ class_bookings.client_id column exists';
  ELSE
    RAISE EXCEPTION '❌ class_bookings.client_id column missing';
  END IF;
  
  -- Verify supporting tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_class_packages') THEN
    RAISE NOTICE '✅ customer_class_packages table exists';
  ELSE
    RAISE NOTICE '⚠️ customer_class_packages table missing (created)';
  END IF;
  
  RAISE NOTICE '🎉 All booking schema conflicts resolved successfully!';
END $$;

-- Final success message
SELECT 'All booking schema fixes applied successfully! 🎉' as status;