-- Fix: Update handle_new_user trigger to create organization_members records
-- This ensures new signups have proper access to create members/clients

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  user_role TEXT;
BEGIN
  -- Set local session to bypass RLS for this transaction
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Extract organization name from metadata
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'organizationName',
    'My Organization'
  );

  -- Generate unique slug from organization name
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  org_slug := regexp_replace(org_slug, '^-+|-+$', '', 'g');
  org_slug := org_slug || '-' || substr(md5(random()::text), 1, 6);

  -- Check if this is the first user (owner) or additional user
  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
    new_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  ELSE
    -- Create new organization (first user = owner)
    INSERT INTO public.organizations (
      name, slug, email, owner_id,
      subscription_plan, subscription_status,
      settings, created_at, updated_at
    )
    VALUES (
      org_name, org_slug, NEW.email, NEW.id,
      'free', 'trial',
      '{"onboarding_completed": false}'::jsonb,
      NOW(), NOW()
    )
    RETURNING id INTO new_org_id;

    user_role := 'owner';
  END IF;

  -- Create user record in public.users
  INSERT INTO public.users (
    id, organization_id, email, name, role,
    avatar_url, created_at, updated_at
  )
  VALUES (
    NEW.id, new_org_id, NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    user_role,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(), NOW()
  );

  -- Create user_organizations link
  INSERT INTO public.user_organizations (
    user_id, organization_id, role
  )
  VALUES (NEW.id, new_org_id, user_role);

  -- FIX: Also create organization_members record for RLS policies
  -- This is required because clients table RLS checks organization_members
  INSERT INTO public.organization_members (
    user_id, organization_id, role, is_active
  )
  VALUES (NEW.id, new_org_id, user_role, true)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;
