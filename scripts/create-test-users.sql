-- Create test users directly in the database
-- This script should be run in the Supabase SQL editor

-- Enable the auth schema
SET search_path TO auth, public;

-- Create test users with specific IDs
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  owner_id uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
BEGIN
  -- Insert test users directly into auth.users
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
    aud
  ) VALUES 
  (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'superadmin@test.example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"role": "superadmin", "subdomain": "admin"}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  ),
  (
    owner_id,
    '00000000-0000-0000-0000-000000000000',
    'owner@test.example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"role": "owner", "subdomain": "login"}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  ),
  (
    member_id,
    '00000000-0000-0000-0000-000000000000',
    'member@test.example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"role": "member", "subdomain": "members"}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- Create organization for owner
  INSERT INTO public.organizations (
    id,
    name,
    owner_id,
    subdomain,
    settings,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Test Organization',
    owner_id,
    'test-org',
    '{}'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (subdomain) DO NOTHING;

  -- Link owner to organization
  INSERT INTO public.organization_staff (
    organization_id,
    user_id,
    role,
    is_active,
    created_at
  ) 
  SELECT 
    o.id,
    owner_id,
    'owner',
    true,
    now()
  FROM public.organizations o
  WHERE o.owner_id = owner_id
  ON CONFLICT DO NOTHING;

  -- Create client record for member
  INSERT INTO public.clients (
    user_id,
    organization_id,
    email,
    name,
    phone,
    created_at
  )
  SELECT
    member_id,
    o.id,
    'member@test.example.com',
    'Test Member',
    '+447000000000',
    now()
  FROM public.organizations o
  WHERE o.subdomain = 'atlas-fitness'
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Test users created successfully';
  RAISE NOTICE 'Admin ID: %', admin_id;
  RAISE NOTICE 'Owner ID: %', owner_id;  
  RAISE NOTICE 'Member ID: %', member_id;
END $$;