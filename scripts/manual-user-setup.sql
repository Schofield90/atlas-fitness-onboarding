-- Manual user setup for sam@gymleadhub.co.uk
-- Run this in the Supabase SQL editor

-- First, check if user exists in auth.users
DO $$
DECLARE
  user_id UUID;
  org_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO user_id FROM auth.users WHERE email = 'sam@gymleadhub.co.uk';
  
  IF user_id IS NULL THEN
    -- Create a new UUID for the user
    user_id := gen_random_uuid();
    
    -- Insert directly into auth.users (bypassing normal signup)
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      user_id,
      'sam@gymleadhub.co.uk',
      crypt('TempPassword123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"full_name": "Sam", "organization_name": "GymLeadHub"}'::jsonb,
      false,
      'authenticated'
    );
    
    RAISE NOTICE 'Auth user created with ID: %', user_id;
  ELSE
    RAISE NOTICE 'Auth user already exists with ID: %', user_id;
  END IF;
  
  -- Ensure user exists in public.users
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (user_id, 'sam@gymleadhub.co.uk', 'Sam', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  
  -- Check if organization exists
  SELECT id INTO org_id FROM public.organizations WHERE owner_id = user_id;
  
  IF org_id IS NULL THEN
    -- Create organization
    org_id := gen_random_uuid();
    
    INSERT INTO public.organizations (id, name, owner_id, created_at, updated_at)
    VALUES (org_id, 'GymLeadHub', user_id, NOW(), NOW());
    
    -- Link user to organization
    INSERT INTO public.user_organizations (user_id, organization_id, role)
    VALUES (user_id, org_id, 'owner')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Organization created with ID: %', org_id;
  ELSE
    RAISE NOTICE 'Organization already exists with ID: %', org_id;
  END IF;
  
  RAISE NOTICE 'Setup complete! User ID: %, Organization ID: %', user_id, org_id;
END $$;

-- Verify the setup
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  o.id as org_id,
  o.name as org_name,
  uo.role
FROM public.users u
LEFT JOIN public.user_organizations uo ON u.id = uo.user_id
LEFT JOIN public.organizations o ON uo.organization_id = o.id
WHERE u.email = 'sam@gymleadhub.co.uk';