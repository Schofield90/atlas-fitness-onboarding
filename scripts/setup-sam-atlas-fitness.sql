-- Script to setup Sam's account with Atlas Fitness organization
-- This bypasses the organization creation step for testing

-- First, check if Sam's user exists and get the user ID
DO $$
DECLARE
    sam_user_id UUID;
    atlas_org_id UUID;
    sam_client_id UUID;
BEGIN
    -- Get Sam's user ID (assuming email is sam@atlas-gyms.co.uk)
    SELECT id INTO sam_user_id 
    FROM auth.users 
    WHERE email = 'sam@atlas-gyms.co.uk'
    LIMIT 1;
    
    IF sam_user_id IS NULL THEN
        RAISE NOTICE 'Sam user not found. Please sign up first with sam@atlas-gyms.co.uk';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found Sam user: %', sam_user_id;
    
    -- Check if Atlas Fitness organization exists
    SELECT id INTO atlas_org_id 
    FROM organizations 
    WHERE name = 'Atlas Fitness'
    LIMIT 1;
    
    IF atlas_org_id IS NULL THEN
        -- Create Atlas Fitness organization
        INSERT INTO organizations (
            id,
            name,
            type,
            industry,
            size,
            website,
            description,
            subscription_tier,
            subscription_status,
            trial_ends_at,
            max_users,
            max_clients,
            owner_id,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Atlas Fitness',
            'gym',
            'fitness',
            '11-50',
            'https://atlas-fitness.com',
            'Premium fitness facility with state-of-the-art equipment and expert trainers',
            'professional',
            'active',
            NOW() + INTERVAL '30 days',
            10,
            1000,
            sam_user_id,
            NOW(),
            NOW()
        ) RETURNING id INTO atlas_org_id;
        
        RAISE NOTICE 'Created Atlas Fitness organization: %', atlas_org_id;
    ELSE
        RAISE NOTICE 'Atlas Fitness already exists: %', atlas_org_id;
        
        -- Update owner if needed
        UPDATE organizations 
        SET owner_id = sam_user_id 
        WHERE id = atlas_org_id;
    END IF;
    
    -- Add Sam as organization staff (owner role)
    INSERT INTO organization_staff (
        id,
        organization_id,
        user_id,
        role,
        permissions,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        atlas_org_id,
        sam_user_id,
        'owner',
        '["all"]'::jsonb,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET 
        role = 'owner',
        permissions = '["all"]'::jsonb,
        is_active = true,
        updated_at = NOW();
    
    RAISE NOTICE 'Added Sam as owner of Atlas Fitness';
    
    -- Update user's metadata to set current organization
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'current_organization_id', atlas_org_id,
            'organization_name', 'Atlas Fitness',
            'organization_role', 'owner',
            'onboarding_completed', true
        )
    WHERE id = sam_user_id;
    
    RAISE NOTICE 'Updated Sam user metadata with organization info';
    
    -- Also check if Sam exists as a client
    SELECT id INTO sam_client_id
    FROM clients
    WHERE user_id = sam_user_id
    LIMIT 1;
    
    IF sam_client_id IS NULL THEN
        -- Create Sam as a client too (for testing client features)
        INSERT INTO clients (
            id,
            user_id,
            organization_id,
            first_name,
            last_name,
            email,
            phone,
            status,
            source,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            sam_user_id,
            atlas_org_id,
            'Sam',
            'Schofield',
            'sam@atlas-gyms.co.uk',
            '+447490253471',
            'active',
            'direct',
            NOW(),
            NOW()
        ) RETURNING id INTO sam_client_id;
        
        RAISE NOTICE 'Created Sam as client: %', sam_client_id;
    ELSE
        RAISE NOTICE 'Sam already exists as client: %', sam_client_id;
    END IF;
    
    -- Create some sample data for Atlas Fitness
    -- Add a location
    INSERT INTO organization_locations (
        id,
        organization_id,
        name,
        address,
        city,
        state,
        zip,
        country,
        phone,
        email,
        is_primary,
        created_at
    ) VALUES (
        gen_random_uuid(),
        atlas_org_id,
        'Atlas Fitness Main',
        '123 High Street',
        'York',
        'Yorkshire',
        'YO1 1AA',
        'UK',
        '+441904123456',
        'york@atlas-fitness.com',
        true,
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Setup complete! Sam can now log in and will be directed to Atlas Fitness dashboard.';
    
END $$;