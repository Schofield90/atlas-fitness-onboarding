-- Create Sam's account in production
-- This ensures Sam can test the login flow

-- First ensure we have the default organization
DO $$
DECLARE
    org_id UUID;
BEGIN
    -- Get the Atlas Fitness organization ID
    SELECT id INTO org_id FROM organizations WHERE name = 'Atlas Fitness' LIMIT 1;
    
    IF org_id IS NULL THEN
        -- If no Atlas Fitness org exists, use the first available org
        SELECT id INTO org_id FROM organizations LIMIT 1;
    END IF;
    
    -- Insert Sam's client account if it doesn't exist
    INSERT INTO clients (
        email,
        first_name,
        last_name,
        phone,
        organization_id,
        created_at,
        updated_at
    )
    VALUES (
        'sam@atlas-gyms.co.uk',
        'Sam',
        'Atlas',
        '+447490253471',
        org_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (email, organization_id) 
    DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        updated_at = NOW();
        
    RAISE NOTICE 'Sam account created/updated successfully';
END $$;