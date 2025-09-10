-- Migration to fix nutrition profiles and related tables
-- This fixes the 400 and 406 errors we're seeing in the console

-- ============================================
-- 1. Fix the bookings table (was causing 400 errors)
-- ============================================

-- First ensure bookings table exists with correct structure
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
    booking_type TEXT DEFAULT 'single',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    CHECK (client_id IS NOT NULL OR customer_id IS NOT NULL)
);

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ============================================
-- 2. Fix class_credits table (was causing 406 errors)
-- ============================================

CREATE TABLE IF NOT EXISTS class_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    credits_remaining INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (client_id IS NOT NULL OR customer_id IS NOT NULL)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_class_credits_client_id ON class_credits(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_class_credits_customer_id ON class_credits(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_class_credits_organization_id ON class_credits(organization_id);

-- ============================================
-- 3. Fix organization_staff permissions (causing 406 errors)
-- ============================================

-- Ensure organization_staff table has correct structure
ALTER TABLE organization_staff 
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS system_mode TEXT DEFAULT 'ai_coach',
ADD COLUMN IF NOT EXISTS visible_systems TEXT[] DEFAULT ARRAY['ai_coach'];

-- ============================================
-- 4. Fix leads table structure
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'NEW',
    source TEXT DEFAULT 'MANUAL',
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes and constraints
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);

-- Clean up duplicate leads before creating unique constraint
DO $$
BEGIN
    -- Delete duplicate leads, keeping the one with the earliest created_at
    DELETE FROM leads a USING leads b
    WHERE a.email = b.email 
    AND a.organization_id = b.organization_id
    AND a.created_at > b.created_at;
END
$$;

-- Now create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_email_org ON leads(email, organization_id);

-- ============================================
-- 5. Fix nutrition_profiles table with proper column support
-- ============================================

-- Drop the problematic constraint first if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nutrition_profiles_person_ref_check'
        AND table_name = 'nutrition_profiles'
    ) THEN
        ALTER TABLE nutrition_profiles DROP CONSTRAINT nutrition_profiles_person_ref_check;
    END IF;
END
$$;

-- Ensure the table has all necessary columns
ALTER TABLE nutrition_profiles
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS sex VARCHAR(10) CHECK (sex IN ('MALE', 'FEMALE', 'OTHER')),
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS current_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS goal_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS target_weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS activity_level TEXT,
ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[],
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS food_likes TEXT[],
ADD COLUMN IF NOT EXISTS food_dislikes TEXT[],
ADD COLUMN IF NOT EXISTS cooking_time TEXT,
ADD COLUMN IF NOT EXISTS budget_constraint TEXT,
ADD COLUMN IF NOT EXISTS meal_count INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS meals_per_day INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS snacks_per_day INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS target_calories INTEGER,
ADD COLUMN IF NOT EXISTS daily_calories INTEGER,
ADD COLUMN IF NOT EXISTS target_protein INTEGER,
ADD COLUMN IF NOT EXISTS protein_grams INTEGER,
ADD COLUMN IF NOT EXISTS target_carbs INTEGER,
ADD COLUMN IF NOT EXISTS carbs_grams INTEGER,
ADD COLUMN IF NOT EXISTS target_fat INTEGER,
ADD COLUMN IF NOT EXISTS fat_grams INTEGER,
ADD COLUMN IF NOT EXISTS target_fiber INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS fiber_grams INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS bmr INTEGER,
ADD COLUMN IF NOT EXISTS tdee INTEGER,
ADD COLUMN IF NOT EXISTS weekly_weight_change_kg DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS training_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make lead_id nullable
ALTER TABLE nutrition_profiles ALTER COLUMN lead_id DROP NOT NULL;

-- Add flexible constraint that allows either client_id or lead_id
ALTER TABLE nutrition_profiles 
ADD CONSTRAINT nutrition_profiles_person_ref_check 
CHECK (
    (client_id IS NOT NULL AND lead_id IS NULL) OR 
    (client_id IS NULL AND lead_id IS NOT NULL) OR
    (client_id IS NULL AND lead_id IS NULL) -- Allow both null for initial setup
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_client_id ON nutrition_profiles(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_lead_id ON nutrition_profiles(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_organization_id ON nutrition_profiles(organization_id);

-- Drop old unique constraints if they exist
ALTER TABLE nutrition_profiles DROP CONSTRAINT IF EXISTS nutrition_profiles_lead_id_organization_id_key;

-- Add new unique constraints
ALTER TABLE nutrition_profiles DROP CONSTRAINT IF EXISTS nutrition_profiles_unique_client_org;
ALTER TABLE nutrition_profiles ADD CONSTRAINT nutrition_profiles_unique_client_org 
UNIQUE NULLS NOT DISTINCT (client_id, organization_id);

ALTER TABLE nutrition_profiles DROP CONSTRAINT IF EXISTS nutrition_profiles_unique_lead_org;
ALTER TABLE nutrition_profiles ADD CONSTRAINT nutrition_profiles_unique_lead_org 
UNIQUE NULLS NOT DISTINCT (lead_id, organization_id);

-- ============================================
-- 6. Create or update RLS policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can manage bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own class_credits" ON class_credits;
DROP POLICY IF EXISTS "Staff can manage class_credits" ON class_credits;
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Staff can manage leads" ON leads;
DROP POLICY IF EXISTS "Users can view own nutrition profile" ON nutrition_profiles;
DROP POLICY IF EXISTS "Clients can view own nutrition profile" ON nutrition_profiles;
DROP POLICY IF EXISTS "Staff can manage nutrition profiles" ON nutrition_profiles;

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can manage bookings" ON bookings
FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_staff 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Class credits policies
CREATE POLICY "Users can view own class_credits" ON class_credits
FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can manage class_credits" ON class_credits
FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_staff 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Leads policies
CREATE POLICY "Staff can manage leads" ON leads
FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_staff 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Nutrition profiles policies
CREATE POLICY "Users can view own nutrition profile" ON nutrition_profiles
FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
    lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can manage nutrition profiles" ON nutrition_profiles
FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_staff 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- ============================================
-- 7. Create helper function to migrate data
-- ============================================

-- Function to ensure all clients have corresponding leads for nutrition
CREATE OR REPLACE FUNCTION ensure_client_lead_mapping()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    -- For each client without a corresponding lead
    FOR rec IN 
        SELECT c.* 
        FROM clients c
        LEFT JOIN leads l ON l.client_id = c.id AND l.organization_id = c.organization_id
        WHERE l.id IS NULL
    LOOP
        -- Create a lead record
        INSERT INTO leads (
            organization_id,
            email,
            first_name,
            last_name,
            phone,
            client_id,
            status,
            source,
            created_at,
            updated_at
        ) VALUES (
            rec.organization_id,
            COALESCE(rec.email, rec.id::text || '@client.temp'),
            rec.first_name,
            rec.last_name,
            rec.phone,
            rec.id,
            'CLIENT',
            'CLIENT_SYNC',
            rec.created_at,
            NOW()
        ) ON CONFLICT (email, organization_id) DO UPDATE
        SET client_id = EXCLUDED.client_id,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT ensure_client_lead_mapping();

-- ============================================
-- 8. Update existing nutrition profiles to have proper foreign keys
-- ============================================

-- For any nutrition profiles with client_id but no lead_id, try to find the lead
UPDATE nutrition_profiles np
SET lead_id = l.id
FROM leads l
WHERE np.client_id = l.client_id 
AND np.organization_id = l.organization_id
AND np.lead_id IS NULL
AND np.client_id IS NOT NULL;

-- ============================================
-- 9. Add helpful comments
-- ============================================

COMMENT ON TABLE nutrition_profiles IS 'Stores nutrition profiles for both clients and leads. Use client_id for existing clients, lead_id for leads.';
COMMENT ON COLUMN nutrition_profiles.client_id IS 'Reference to clients table - use for existing gym members';
COMMENT ON COLUMN nutrition_profiles.lead_id IS 'Reference to leads table - use for prospects or when client_id not available';
COMMENT ON COLUMN nutrition_profiles.height IS 'Height in centimeters (alternative column name for height_cm)';
COMMENT ON COLUMN nutrition_profiles.current_weight IS 'Current weight in kg (alternative column name for weight_kg)';
COMMENT ON COLUMN nutrition_profiles.goal_weight IS 'Goal weight in kg (alternative column name for target_weight_kg)';
COMMENT ON COLUMN nutrition_profiles.target_protein IS 'Target protein in grams (alternative column name for protein_grams)';
COMMENT ON COLUMN nutrition_profiles.target_carbs IS 'Target carbs in grams (alternative column name for carbs_grams)';
COMMENT ON COLUMN nutrition_profiles.target_fat IS 'Target fat in grams (alternative column name for fat_grams)';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '- Fixed bookings table structure';
    RAISE NOTICE '- Fixed class_credits table structure';
    RAISE NOTICE '- Fixed organization_staff columns';
    RAISE NOTICE '- Fixed leads table structure';
    RAISE NOTICE '- Fixed nutrition_profiles with flexible client_id/lead_id support';
    RAISE NOTICE '- Updated RLS policies for all tables';
    RAISE NOTICE '- Created client-lead mapping for existing data';
END
$$;