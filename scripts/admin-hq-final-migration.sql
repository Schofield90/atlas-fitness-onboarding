-- Admin HQ Foundation Migration
-- Run this in Supabase SQL Editor
-- Updated for sam@gymleadhub.co.uk

-- 1. Create admin roles enum (safe to re-run)
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('platform_owner', 'platform_admin', 'platform_support', 'platform_readonly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create super_admin_users table
CREATE TABLE IF NOT EXISTS super_admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'platform_readonly',
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- 3. Create admin_activity_logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES super_admin_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resource_type TEXT,
  resource_id TEXT,
  action_details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create admin_organization_access table
CREATE TABLE IF NOT EXISTS admin_organization_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES super_admin_users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read', 'write')),
  reason TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES super_admin_users(id),
  revoke_reason TEXT,
  is_active BOOLEAN GENERATED ALWAYS AS (
    revoked_at IS NULL AND expires_at > NOW()
  ) STORED,
  CONSTRAINT valid_expiry CHECK (expires_at > granted_at),
  CONSTRAINT max_duration CHECK (expires_at <= granted_at + INTERVAL '4 hours')
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin ON admin_activity_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_org ON admin_activity_logs(target_organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_org_access_active ON admin_organization_access(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_org_access_admin ON admin_organization_access(admin_user_id);

-- 6. Enable RLS on admin tables
ALTER TABLE super_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_organization_access ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for super_admin_users
CREATE POLICY "Platform owners can manage admins" ON super_admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM super_admin_users sau
      WHERE sau.user_id = auth.uid()
      AND sau.role = 'platform_owner'
      AND sau.is_active = true
    )
  );

CREATE POLICY "Admins can view themselves" ON super_admin_users
  FOR SELECT
  USING (user_id = auth.uid());

-- 8. Create RLS policies for admin_activity_logs
CREATE POLICY "Admins can view activity logs" ON admin_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM super_admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- 9. Create RLS policies for admin_organization_access
CREATE POLICY "Platform admins can manage access" ON admin_organization_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM super_admin_users
      WHERE user_id = auth.uid()
      AND role IN ('platform_owner', 'platform_admin')
      AND is_active = true
    )
  );

-- 10. Create helper functions
CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admin_users
    WHERE user_id = check_user_id
    AND is_active = true
    AND role IN ('platform_owner', 'platform_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create admin organization metrics view
CREATE OR REPLACE VIEW admin_organization_metrics AS
SELECT 
  o.id,
  o.name,
  o.slug,
  o.created_at,
  o.subscription_status,
  o.subscription_plan,
  o.trial_ends_at,
  (SELECT COUNT(*) FROM user_organizations uo WHERE uo.organization_id = o.id AND uo.is_active = true) as active_users,
  (SELECT MAX(u.last_sign_in_at) FROM users u 
   JOIN user_organizations uo ON uo.user_id = u.id 
   WHERE uo.organization_id = o.id) as last_activity,
  (SELECT COUNT(*) FROM leads l WHERE l.organization_id = o.id) as total_leads,
  (SELECT COUNT(*) FROM leads l WHERE l.organization_id = o.id AND l.created_at > NOW() - INTERVAL '30 days') as leads_30d,
  (SELECT COUNT(*) FROM bookings b WHERE b.organization_id = o.id) as total_bookings,
  (SELECT COUNT(*) FROM bookings b WHERE b.organization_id = o.id AND b.created_at > NOW() - INTERVAL '30 days') as bookings_30d,
  bs.status as billing_status,
  bs.current_period_end,
  bs.cancel_at,
  bs.canceled_at,
  COALESCE(bp.amount / 100.0, 0) as mrr,
  COALESCE(bp.amount * 12 / 100.0, 0) as arr_estimate
FROM organizations o
LEFT JOIN billing_subscriptions bs ON bs.organization_id = o.id AND bs.is_primary = true
LEFT JOIN billing_plans bp ON bp.id = bs.plan_id;

-- 12. Create admin financial overview view
CREATE OR REPLACE VIEW admin_financial_overview AS
SELECT
  COUNT(DISTINCT bs.organization_id) FILTER (WHERE bs.status = 'active') as active_subscriptions,
  COUNT(DISTINCT bs.organization_id) FILTER (WHERE bs.status = 'trialing') as trialing_subscriptions,
  COUNT(DISTINCT bs.organization_id) FILTER (WHERE bs.status IN ('past_due', 'unpaid')) as at_risk_subscriptions,
  SUM(CASE WHEN bs.status = 'active' THEN bp.amount / 100.0 ELSE 0 END) as total_mrr,
  SUM(CASE WHEN bs.status = 'active' THEN bp.amount * 12 / 100.0 ELSE 0 END) as total_arr,
  (SELECT COUNT(*) FROM connected_accounts WHERE provider = 'stripe' AND is_active = true) as stripe_connected_accounts,
  (SELECT COUNT(*) FROM connected_accounts WHERE provider = 'gocardless' AND is_active = true) as gocardless_connected_accounts,
  (SELECT SUM(amount) / 100.0 FROM gym_charges WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '30 days') as gym_revenue_30d,
  (SELECT SUM(application_fee_amount) / 100.0 FROM gym_charges WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '30 days') as platform_fees_30d
FROM billing_subscriptions bs
LEFT JOIN billing_plans bp ON bp.id = bs.plan_id
WHERE bs.is_primary = true;

-- 13. Grant permissions on views
GRANT SELECT ON admin_organization_metrics TO authenticated;
GRANT SELECT ON admin_financial_overview TO authenticated;

-- 14. Create update trigger for super_admin_users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_super_admin_users_updated_at
  BEFORE UPDATE ON super_admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 15. Set up sam@gymleadhub.co.uk as platform owner
-- This will only work if the user already exists in auth.users
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find the user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'sam@gymleadhub.co.uk'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- User exists, make them platform owner
    INSERT INTO super_admin_users (user_id, role, created_by, is_active)
    VALUES (v_user_id, 'platform_owner', v_user_id, true)
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'platform_owner', is_active = true, updated_at = NOW();
    
    RAISE NOTICE 'Successfully set sam@gymleadhub.co.uk as platform owner';
  ELSE
    RAISE NOTICE 'User sam@gymleadhub.co.uk not found. Please sign up first, then run: INSERT INTO super_admin_users (user_id, role, created_by) SELECT id, ''platform_owner'', id FROM auth.users WHERE email = ''sam@gymleadhub.co.uk'';';
  END IF;
END $$;

-- 16. Verify the migration
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Admin HQ Migration Complete!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ super_admin_users';
  RAISE NOTICE '  ✓ admin_activity_logs';
  RAISE NOTICE '  ✓ admin_organization_access';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. If sam@gymleadhub.co.uk is not yet registered:';
  RAISE NOTICE '   - Sign up with sam@gymleadhub.co.uk';
  RAISE NOTICE '   - Run the SQL command shown above';
  RAISE NOTICE '2. Navigate to /admin to access Admin HQ';
  RAISE NOTICE '';
END $$;