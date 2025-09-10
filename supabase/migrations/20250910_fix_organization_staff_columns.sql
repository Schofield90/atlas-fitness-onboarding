-- Fix organization_staff table to have all required columns
-- This fixes the 406 errors we're seeing in the console

-- Add missing columns to organization_staff table if they don't exist
ALTER TABLE organization_staff 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS system_mode TEXT DEFAULT 'ai_coach',
ADD COLUMN IF NOT EXISTS visible_systems TEXT[] DEFAULT ARRAY['ai_coach'];

-- Ensure there's at least one staff record for the test user
DO $$
BEGIN
    -- Check if a record exists for the user
    IF NOT EXISTS (
        SELECT 1 FROM organization_staff 
        WHERE user_id = '9f2385c4-c178-435f-80ff-75972314ca2a'
        AND organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
    ) THEN
        -- Insert a staff record
        INSERT INTO organization_staff (
            organization_id,
            user_id,
            role,
            is_active,
            permissions,
            system_mode,
            visible_systems
        ) VALUES (
            '63589490-8f55-4157-bd3a-e141594b748e',
            '9f2385c4-c178-435f-80ff-75972314ca2a',
            'admin',
            true,
            '["all"]'::jsonb,
            'ai_coach',
            ARRAY['ai_coach', 'nutrition']
        );
    END IF;
END
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_staff_user_id ON organization_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_staff_organization_id ON organization_staff(organization_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';