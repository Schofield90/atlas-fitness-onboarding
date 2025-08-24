-- Critical Facebook Integration Fix Migration
-- Fixes all database schema issues for Facebook integration

-- 1. Fix facebook_lead_forms table relationship
-- First, ensure facebook_lead_forms table exists with proper structure
CREATE TABLE IF NOT EXISTS facebook_lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_id UUID REFERENCES facebook_pages(id) ON DELETE CASCADE,
  facebook_page_id VARCHAR,
  facebook_form_id VARCHAR NOT NULL,
  form_name VARCHAR,
  form_status VARCHAR DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facebook_form_id)
);

-- 2. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_org_id ON facebook_lead_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_facebook_page_id ON facebook_lead_forms(facebook_page_id);

-- 3. Enable RLS on facebook_lead_forms
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for facebook_lead_forms
DROP POLICY IF EXISTS "Users can view their organization's lead forms" ON facebook_lead_forms;
CREATE POLICY "Users can view their organization's lead forms" ON facebook_lead_forms
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage their organization's lead forms" ON facebook_lead_forms;
CREATE POLICY "Users can manage their organization's lead forms" ON facebook_lead_forms
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- 5. Ensure facebook_pages table has all necessary columns
ALTER TABLE facebook_pages 
  ADD COLUMN IF NOT EXISTS page_username VARCHAR,
  ADD COLUMN IF NOT EXISTS page_category VARCHAR,
  ADD COLUMN IF NOT EXISTS page_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- 6. Ensure facebook_integrations has all necessary columns
ALTER TABLE facebook_integrations
  ADD COLUMN IF NOT EXISTS connection_status VARCHAR DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS error_details JSONB,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- 7. Create facebook_ad_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS facebook_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES facebook_integrations(id) ON DELETE CASCADE,
  facebook_account_id VARCHAR NOT NULL,
  account_name VARCHAR,
  account_status INTEGER,
  currency VARCHAR,
  timezone VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facebook_account_id)
);

-- 8. Add indexes for facebook_ad_accounts
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_org_id ON facebook_ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_integration_id ON facebook_ad_accounts(integration_id);

-- 9. Enable RLS on facebook_ad_accounts
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for facebook_ad_accounts
DROP POLICY IF EXISTS "Users can view their organization's ad accounts" ON facebook_ad_accounts;
CREATE POLICY "Users can view their organization's ad accounts" ON facebook_ad_accounts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage their organization's ad accounts" ON facebook_ad_accounts;
CREATE POLICY "Users can manage their organization's ad accounts" ON facebook_ad_accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- 11. Create a function to safely get user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_organizations
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create view for easy access to user's organizations (without owner_id)
CREATE OR REPLACE VIEW user_accessible_organizations AS
SELECT 
  o.id,
  o.name,
  o.subdomain,
  o.plan,
  o.status,
  o.settings,
  o.created_at,
  o.updated_at,
  uo.role as user_role,
  uo.user_id
FROM organizations o
INNER JOIN user_organizations uo ON o.id = uo.organization_id
WHERE uo.is_active = true;

-- Grant access to the view
GRANT SELECT ON user_accessible_organizations TO authenticated;

-- 13. Fix any orphaned facebook_pages records
UPDATE facebook_pages fp
SET organization_id = fi.organization_id
FROM facebook_integrations fi
WHERE fp.integration_id = fi.id
AND fp.organization_id IS NULL;

-- 14. Ensure all tables have updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_facebook_pages_updated_at ON facebook_pages;
CREATE TRIGGER update_facebook_pages_updated_at
  BEFORE UPDATE ON facebook_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facebook_lead_forms_updated_at ON facebook_lead_forms;
CREATE TRIGGER update_facebook_lead_forms_updated_at
  BEFORE UPDATE ON facebook_lead_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facebook_ad_accounts_updated_at ON facebook_ad_accounts;
CREATE TRIGGER update_facebook_ad_accounts_updated_at
  BEFORE UPDATE ON facebook_ad_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 15. Add helper function to check Facebook integration status
CREATE OR REPLACE FUNCTION check_facebook_integration_status(org_id UUID)
RETURNS TABLE (
  is_connected BOOLEAN,
  integration_id UUID,
  facebook_user_name VARCHAR,
  token_expires_at TIMESTAMPTZ,
  has_pages BOOLEAN,
  page_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fi.is_active as is_connected,
    fi.id as integration_id,
    fi.facebook_user_name,
    fi.token_expires_at,
    EXISTS(SELECT 1 FROM facebook_pages fp WHERE fp.organization_id = org_id AND fp.is_active = true) as has_pages,
    (SELECT COUNT(*)::INTEGER FROM facebook_pages fp WHERE fp.organization_id = org_id AND fp.is_active = true) as page_count
  FROM facebook_integrations fi
  WHERE fi.organization_id = org_id
  AND fi.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_facebook_integration_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;