-- Direct SQL to create sam@gymleadhub.co.uk user
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  user_id UUID := gen_random_uuid();
  org_id UUID := gen_random_uuid();
BEGIN
  -- Create the auth user (bypassing normal auth flow)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    confirmation_token,
    recovery_token
  ) VALUES (
    user_id,
    '00000000-0000-0000-0000-000000000000',
    'sam@gymleadhub.co.uk',
    crypt('Password123!', gen_salt('bf')), -- Change this password!
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object(
      'full_name', 'Sam',
      'organization_name', 'GymLeadHub'
    ),
    false,
    'authenticated',
    'authenticated',
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex')
  );
  
  -- Create the public user record
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    'sam@gymleadhub.co.uk',
    'Sam',
    NOW(),
    NOW()
  );
  
  -- Create organization
  INSERT INTO public.organizations (
    id,
    name,
    slug,
    created_at,
    updated_at
  ) VALUES (
    org_id,
    'GymLeadHub',
    'gymleadhub-' || substr(md5(random()::text), 1, 8),
    NOW(),
    NOW()
  );
  
  -- Link user to organization as owner
  INSERT INTO public.organization_members (
    user_id,
    org_id,
    role
  ) VALUES (
    user_id,
    org_id,
    'owner'
  );
  
  RAISE NOTICE 'User created successfully!';
  RAISE NOTICE 'Email: sam@gymleadhub.co.uk';
  RAISE NOTICE 'Password: Password123!';
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE 'Organization ID: %', org_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user: %', SQLERRM;
    RAISE;
END $$;

-- Verify the user was created
SELECT 
  u.id,
  u.email,
  u.full_name,
  o.name as organization,
  om.role
FROM public.users u
LEFT JOIN public.organization_members om ON u.id = om.user_id
LEFT JOIN public.organizations o ON om.org_id = o.id
WHERE u.email = 'sam@gymleadhub.co.uk';