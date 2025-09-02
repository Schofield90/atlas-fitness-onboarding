-- Fix Admin RLS Policies - Remove infinite recursion

-- 1. Drop problematic policies
DROP POLICY IF EXISTS "Super admins can view all super admins" ON public.super_admin_users;
DROP POLICY IF EXISTS "Super admins can view access records" ON public.admin_organization_access;
DROP POLICY IF EXISTS "Super admins can view activity logs" ON public.admin_activity_logs;

-- 2. Temporarily disable RLS to fix the tables
ALTER TABLE public.super_admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_organization_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs DISABLE ROW LEVEL SECURITY;

-- 3. Ensure sam@atlas-gyms.co.uk has proper admin access
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID for sam@atlas-gyms.co.uk
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'sam@atlas-gyms.co.uk'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Ensure entry exists in super_admin_users
    INSERT INTO public.super_admin_users (user_id, role, is_active)
    VALUES (v_user_id, 'platform_admin', true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = 'platform_admin',
      is_active = true,
      updated_at = NOW();
    
    RAISE NOTICE 'Admin access confirmed for sam@atlas-gyms.co.uk';
  END IF;
END $$;

-- 4. Create a helper function to check admin status (prevents recursion)
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Simple check without recursive table access
  RETURN EXISTS (
    SELECT 1 
    FROM public.super_admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-enable RLS with simpler policies
ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;

-- Simple policy for super_admin_users: users can see their own record
CREATE POLICY "Users can view own admin status" ON public.super_admin_users
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin users can manage the table
CREATE POLICY "Platform admins can manage admin users" ON public.super_admin_users
  FOR ALL
  USING (
    -- Check if current user is sam@atlas-gyms.co.uk or sam@gymleadhub.co.uk
    auth.jwt() ->> 'email' IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk')
  );

-- 6. For other admin tables, use the helper function
ALTER TABLE public.admin_organization_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage organization access" ON public.admin_organization_access
  FOR ALL
  USING (is_platform_admin());

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
  FOR ALL
  USING (is_platform_admin());

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.super_admin_users TO authenticated;
GRANT ALL ON public.admin_organization_access TO authenticated;
GRANT ALL ON public.admin_activity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

-- 8. Verify the fix
SELECT 
  'Admin Setup Complete' as status,
  COUNT(*) as admin_users,
  array_agg(u.email) as admin_emails
FROM public.super_admin_users sau
JOIN auth.users u ON u.id = sau.user_id
WHERE sau.is_active = true;