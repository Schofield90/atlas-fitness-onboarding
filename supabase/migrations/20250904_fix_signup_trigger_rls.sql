-- Migration: Fix signup flow RLS and trigger issues
-- Date: 2025-09-04
-- Description: Updates handle_new_user() trigger to bypass RLS and fixes schema mismatches
-- Issue: New user signups were failing with "new row violates row-level security policy for table 'users'"
-- Root Cause:
--   1. Trigger function was attempting to insert a 'settings' column that doesn't exist in users table
--   2. RLS policies were blocking trigger inserts because trigger context doesn't have JWT claims
-- Solution:
--   1. Remove 'settings' column from users insert
--   2. Add set_config() call to set JWT claims to 'service_role' for RLS bypass
--   3. Function is SECURITY DEFINER so it runs with postgres privileges

-- Drop and recreate the trigger function with proper RLS bypass
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  user_role TEXT;
BEGIN
  -- Set local session to bypass RLS for this transaction
  -- This is safe because the function is SECURITY DEFINER and runs as postgres
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Extract organization name from metadata
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'organizationName',
    'My Organization'
  );

  -- Generate unique slug from organization name
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  org_slug := regexp_replace(org_slug, '^-+|-+$', '', 'g'); -- Remove leading/trailing hyphens
  org_slug := org_slug || '-' || substr(md5(random()::text), 1, 6); -- Add random suffix

  -- Check if this is the first user (owner) or additional user
  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
    new_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  ELSE
    -- Create new organization (first user = owner)
    INSERT INTO public.organizations (
      name,
      slug,
      email,
      owner_id,
      subscription_plan,
      subscription_status,
      settings,
      created_at,
      updated_at
    )
    VALUES (
      org_name,
      org_slug,
      NEW.email,
      NEW.id,
      'free',
      'trial',
      '{"onboarding_completed": false}'::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_org_id;

    user_role := 'owner';
  END IF;

  -- Create user record in public.users
  -- Note: users table does NOT have a settings column
  INSERT INTO public.users (
    id,
    organization_id,
    email,
    name,
    role,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    user_role,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );

  -- Also create user_organizations link for multi-org support
  INSERT INTO public.user_organizations (
    user_id,
    organization_id,
    role
  )
  VALUES (
    NEW.id,
    new_org_id,
    user_role
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth signup
    RAISE WARNING 'Failed to create user profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Ensure trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Verify trigger is enabled
SELECT
  t.tgname as trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    ELSE 'unknown'
  END as status,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';
