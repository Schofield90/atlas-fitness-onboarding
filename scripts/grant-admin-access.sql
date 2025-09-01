-- Grant sam@atlas-gyms.co.uk full admin access to the SaaS platform
-- This script adds the user to the super_admin_users table

-- First, get the user ID for sam@atlas-gyms.co.uk
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'sam@atlas-gyms.co.uk'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User sam@atlas-gyms.co.uk not found in auth.users';
    ELSE
        -- Insert or update the super_admin_users record
        INSERT INTO public.super_admin_users (
            user_id,
            role,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            'super_admin', -- Full admin role
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET
            role = 'super_admin',
            is_active = true,
            updated_at = NOW();
        
        RAISE NOTICE 'Successfully granted admin access to sam@atlas-gyms.co.uk (User ID: %)', v_user_id;
    END IF;
END $$;

-- Verify the admin access was granted
SELECT 
    u.email,
    sau.user_id,
    sau.role,
    sau.is_active,
    sau.created_at,
    sau.updated_at
FROM public.super_admin_users sau
JOIN auth.users u ON u.id = sau.user_id
WHERE u.email = 'sam@atlas-gyms.co.uk';