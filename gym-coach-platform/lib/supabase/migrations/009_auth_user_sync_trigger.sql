-- Migration: Auto-sync auth.users to public.users table
-- Purpose: Fix "Organization not found" errors by ensuring every auth user has a corresponding users record
-- Created: 2025-09-30

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  user_role TEXT;
BEGIN
  -- Extract organization name from metadata (provided during signup)
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'organizationName',
    'My Organization'
  );

  -- Check if this is the first user (owner) or additional user
  -- If organization_id is in metadata, use it (existing org)
  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
    new_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  ELSE
    -- Create new organization (first user = owner)
    INSERT INTO public.organizations (
      name,
      email,
      subscription_plan,
      subscription_status,
      settings,
      created_at,
      updated_at
    )
    VALUES (
      org_name,
      NEW.email,
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
  INSERT INTO public.users (
    id,
    organization_id,
    email,
    name,
    role,
    avatar_url,
    settings,
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
    '{}'::jsonb,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth signup
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT ON public.users TO anon, authenticated;
GRANT ALL ON public.organizations TO postgres, service_role;
GRANT SELECT ON public.organizations TO anon, authenticated;

-- Migration complete
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates organization and user profile when auth user is created';