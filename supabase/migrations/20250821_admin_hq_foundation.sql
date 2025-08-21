-- Admin HQ Foundation Migration
-- Creates secure admin infrastructure for multi-tenant SaaS operations
-- SOC 2 compliant with audit trails and least-privilege principles

-- 1. Create admin roles enum
CREATE TYPE admin_role AS ENUM ('platform_owner', 'platform_admin', 'platform_support', 'platform_readonly');

-- 2. Super Admin Users table
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

-- 3. Admin Activity Logs (SOC 2 compliance)
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

-- 4. Admin Organization Access (time-boxed impersonation)
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
CREATE INDEX idx_admin_activity_logs_admin ON admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_activity_logs_org ON admin_activity_logs(target_organization_id);
CREATE INDEX idx_admin_activity_logs_created ON admin_activity_logs(created_at DESC);
CREATE INDEX idx_admin_org_access_active ON admin_organization_access(is_active) WHERE is_active = true;
CREATE INDEX idx_admin_org_access_admin ON admin_organization_access(admin_user_id);

-- 6. RLS Policies for admin tables

-- Super admin users: only platform_owner can manage
ALTER TABLE super_admin_users ENABLE ROW LEVEL SECURITY;

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

-- Admin activity logs: admins can view, system can insert
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs" ON admin_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM super_admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Admin organization access: managed by platform_admin or higher
ALTER TABLE admin_organization_access ENABLE ROW LEVEL SECURITY;

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

-- 7. Helper function to check if user is admin
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

-- 8. Helper function to check admin access to organization
CREATE OR REPLACE FUNCTION has_admin_access_to_org(
  check_org_id UUID,
  required_level TEXT DEFAULT 'read',
  check_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is active admin
  IF NOT EXISTS (
    SELECT 1 FROM super_admin_users
    WHERE user_id = check_user_id
    AND is_active = true
  ) THEN
    RETURN FALSE;
  END IF;

  -- Platform owners always have access
  IF EXISTS (
    SELECT 1 FROM super_admin_users
    WHERE user_id = check_user_id
    AND role = 'platform_owner'
    AND is_active = true
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check for active access grant
  RETURN EXISTS (
    SELECT 1 FROM admin_organization_access aoa
    JOIN super_admin_users sau ON sau.id = aoa.admin_user_id
    WHERE sau.user_id = check_user_id
    AND aoa.organization_id = check_org_id
    AND aoa.is_active = true
    AND (
      aoa.access_level = required_level
      OR (required_level = 'read' AND aoa.access_level = 'write')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Admin views for organization metrics
CREATE OR REPLACE VIEW admin_organization_metrics AS
SELECT 
  o.id,
  o.name,
  o.slug,
  o.created_at,
  o.subscription_status,
  o.subscription_plan,
  o.trial_ends_at,
  -- User metrics
  (SELECT COUNT(*) FROM user_organizations uo WHERE uo.organization_id = o.id AND uo.is_active = true) as active_users,
  (SELECT MAX(u.last_sign_in_at) FROM users u 
   JOIN user_organizations uo ON uo.user_id = u.id 
   WHERE uo.organization_id = o.id) as last_activity,
  -- Lead metrics
  (SELECT COUNT(*) FROM leads l WHERE l.organization_id = o.id) as total_leads,
  (SELECT COUNT(*) FROM leads l WHERE l.organization_id = o.id AND l.created_at > NOW() - INTERVAL '30 days') as leads_30d,
  -- Booking metrics
  (SELECT COUNT(*) FROM bookings b WHERE b.organization_id = o.id) as total_bookings,
  (SELECT COUNT(*) FROM bookings b WHERE b.organization_id = o.id AND b.created_at > NOW() - INTERVAL '30 days') as bookings_30d,
  -- Revenue metrics (from billing_subscriptions)
  bs.status as billing_status,
  bs.current_period_end,
  bs.cancel_at,
  bs.canceled_at,
  COALESCE(bp.amount / 100.0, 0) as mrr,
  COALESCE(bp.amount * 12 / 100.0, 0) as arr_estimate
FROM organizations o
LEFT JOIN billing_subscriptions bs ON bs.organization_id = o.id AND bs.is_primary = true
LEFT JOIN billing_plans bp ON bp.id = bs.plan_id;

-- Grant access to admin view
GRANT SELECT ON admin_organization_metrics TO authenticated;

-- 10. Admin financial overview
CREATE OR REPLACE VIEW admin_financial_overview AS
SELECT
  -- Platform SaaS metrics
  COUNT(DISTINCT bs.organization_id) FILTER (WHERE bs.status = 'active') as active_subscriptions,
  COUNT(DISTINCT bs.organization_id) FILTER (WHERE bs.status = 'trialing') as trialing_subscriptions,
  COUNT(DISTINCT bs.organization_id) FILTER (WHERE bs.status IN ('past_due', 'unpaid')) as at_risk_subscriptions,
  SUM(CASE WHEN bs.status = 'active' THEN bp.amount / 100.0 ELSE 0 END) as total_mrr,
  SUM(CASE WHEN bs.status = 'active' THEN bp.amount * 12 / 100.0 ELSE 0 END) as total_arr,
  -- Gym payment processing metrics
  (SELECT COUNT(*) FROM connected_accounts WHERE provider = 'stripe' AND is_active = true) as stripe_connected_accounts,
  (SELECT COUNT(*) FROM connected_accounts WHERE provider = 'gocardless' AND is_active = true) as gocardless_connected_accounts,
  (SELECT SUM(amount) / 100.0 FROM gym_charges WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '30 days') as gym_revenue_30d,
  (SELECT SUM(application_fee_amount) / 100.0 FROM gym_charges WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '30 days') as platform_fees_30d
FROM billing_subscriptions bs
LEFT JOIN billing_plans bp ON bp.id = bs.plan_id
WHERE bs.is_primary = true;

-- Grant access to financial view
GRANT SELECT ON admin_financial_overview TO authenticated;

-- 11. Audit trigger for admin actions
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get admin user id
  SELECT id INTO admin_id FROM super_admin_users WHERE user_id = auth.uid() AND is_active = true;
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO admin_activity_logs (
      admin_user_id,
      action_type,
      resource_type,
      resource_id,
      action_details
    ) VALUES (
      admin_id,
      TG_OP,
      TG_TABLE_NAME,
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
        ELSE NEW.id::TEXT
      END,
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    );
  END IF;
  
  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add update trigger for super_admin_users
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

-- 12. Initial platform owner
-- Setting up sam@gymleadhub.co.uk as platform owner
INSERT INTO super_admin_users (user_id, role, created_by)
SELECT id, 'platform_owner', id
FROM auth.users
WHERE email = 'sam@gymleadhub.co.uk'
ON CONFLICT (user_id) DO UPDATE
SET role = 'platform_owner', is_active = true;