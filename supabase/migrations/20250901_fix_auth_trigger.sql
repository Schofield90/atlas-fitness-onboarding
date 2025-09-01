-- Fix auth trigger to handle user creation properly
-- This ensures users are created in public.users when auth succeeds

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();

  -- If organization_name is provided, create organization
  IF NEW.raw_user_meta_data->>'organization_name' IS NOT NULL THEN
    DECLARE
      org_id UUID;
      org_slug TEXT;
    BEGIN
      -- Generate slug from organization name
      org_slug := lower(regexp_replace(NEW.raw_user_meta_data->>'organization_name', '[^a-z0-9]+', '-', 'g'));
      org_slug := regexp_replace(org_slug, '^-|-$', '', 'g');
      
      -- Ensure slug is unique
      WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) LOOP
        org_slug := org_slug || '-' || substr(md5(random()::text), 1, 4);
      END LOOP;
      
      -- Create organization
      INSERT INTO public.organizations (name, slug, created_at, updated_at)
      VALUES (
        NEW.raw_user_meta_data->>'organization_name',
        org_slug,
        NOW(),
        NOW()
      )
      RETURNING id INTO org_id;
      
      -- Link user to organization as owner
      INSERT INTO public.organization_members (user_id, org_id, role)
      VALUES (NEW.id, org_id, 'owner')
      ON CONFLICT DO NOTHING;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block auth
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Ensure RLS is properly configured
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  -- Users table policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.users
      FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.users
      FOR UPDATE USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Service role has full access'
  ) THEN
    CREATE POLICY "Service role has full access" ON public.users
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');
  END IF;

  -- Organization members policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_members' 
    AND policyname = 'Users can view their memberships'
  ) THEN
    CREATE POLICY "Users can view their memberships" ON public.organization_members
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Organizations policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Members can view their organizations'
  ) THEN
    CREATE POLICY "Members can view their organizations" ON public.organizations
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE org_id = organizations.id
          AND user_id = auth.uid()
        )
      );
  END IF;
END $$;