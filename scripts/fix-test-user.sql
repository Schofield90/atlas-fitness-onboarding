-- Fix the test user that was created without organization
-- This script will properly link the test user to an organization

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'testgym.leeds@example.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;
  
  -- Check if user exists in public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    INSERT INTO public.users (id, email, name)
    VALUES (v_user_id, 'testgym.leeds@example.com', 'Test Gym Owner');
    RAISE NOTICE 'Created user record in public.users';
  END IF;
  
  -- Check if user already has an organization
  SELECT organization_id INTO v_org_id
  FROM public.user_organizations
  WHERE user_id = v_user_id;
  
  IF v_org_id IS NULL THEN
    -- Create organization
    INSERT INTO public.organizations (name, slug, email, phone, subscription_status)
    VALUES ('Test Gym Leeds', 'test-gym-leeds', 'testgym.leeds@example.com', '07700900123', 'trialing')
    RETURNING id INTO v_org_id;
    
    -- Link user to organization as owner
    INSERT INTO public.user_organizations (user_id, organization_id, role)
    VALUES (v_user_id, v_org_id, 'owner');
    
    RAISE NOTICE 'Created organization and linked user as owner. Organization ID: %', v_org_id;
  ELSE
    -- Update role to owner if not already
    UPDATE public.user_organizations
    SET role = 'owner'
    WHERE user_id = v_user_id AND organization_id = v_org_id;
    
    RAISE NOTICE 'User already has organization. Updated role to owner. Organization ID: %', v_org_id;
  END IF;
  
  -- Also ensure organization_members table is updated (if it exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (v_user_id, v_org_id, 'owner')
    ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'owner';
    RAISE NOTICE 'Updated organization_members table';
  END IF;
  
END $$;

-- Verify the fix
SELECT 
  u.email,
  u.name,
  o.name as org_name,
  uo.role,
  o.subscription_status
FROM public.users u
JOIN public.user_organizations uo ON u.id = uo.user_id
JOIN public.organizations o ON uo.organization_id = o.id
WHERE u.email = 'testgym.leeds@example.com';