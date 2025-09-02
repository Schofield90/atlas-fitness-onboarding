-- Create super_admin_users table for SaaS admin access
CREATE TABLE IF NOT EXISTS public.super_admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create admin_organization_access table for impersonation tracking
CREATE TABLE IF NOT EXISTS public.admin_organization_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES public.super_admin_users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read', 'write')),
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES public.super_admin_users(id),
  revoke_reason TEXT,
  is_active BOOLEAN GENERATED ALWAYS AS (
    revoked_at IS NULL AND expires_at > NOW()
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_activity_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES public.super_admin_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_org_access_active ON public.admin_organization_access(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_org_access_admin ON public.admin_organization_access(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin ON public.admin_activity_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_org ON public.admin_activity_logs(target_organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created ON public.admin_activity_logs(created_at DESC);

-- Grant super admin access to specific users
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Grant access to sam@atlas-gyms.co.uk
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'sam@atlas-gyms.co.uk'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.super_admin_users (user_id, role, is_active)
    VALUES (v_user_id, 'super_admin', true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = 'super_admin',
      is_active = true,
      updated_at = NOW();
    
    RAISE NOTICE 'Super admin access granted to sam@atlas-gyms.co.uk';
  END IF;

  -- Grant access to sam@gymleadhub.co.uk
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'sam@gymleadhub.co.uk'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.super_admin_users (user_id, role, is_active)
    VALUES (v_user_id, 'super_admin', true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = 'super_admin',
      is_active = true,
      updated_at = NOW();
    
    RAISE NOTICE 'Super admin access granted to sam@gymleadhub.co.uk';
  END IF;
END $$;

-- Add RLS policies for super admin tables
ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_organization_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can see all super admin users
CREATE POLICY "Super admins can view all super admins" ON public.super_admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admin_users sau
      WHERE sau.user_id = auth.uid()
      AND sau.is_active = true
    )
  );

-- Super admins can see all access records
CREATE POLICY "Super admins can view access records" ON public.admin_organization_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admin_users sau
      WHERE sau.user_id = auth.uid()
      AND sau.is_active = true
    )
  );

-- Super admins can see all activity logs
CREATE POLICY "Super admins can view activity logs" ON public.admin_activity_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admin_users sau
      WHERE sau.user_id = auth.uid()
      AND sau.is_active = true
    )
  );