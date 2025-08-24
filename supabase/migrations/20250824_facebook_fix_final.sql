-- Facebook Integration Fix Migration
-- This migration fixes all Facebook integration issues

-- 1. Drop and recreate facebook_lead_forms table
DROP TABLE IF EXISTS facebook_lead_forms CASCADE;

CREATE TABLE facebook_lead_forms (
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

-- 2. Create facebook_ad_accounts table
DROP TABLE IF EXISTS facebook_ad_accounts CASCADE;

CREATE TABLE facebook_ad_accounts (
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

-- 3. Add missing columns to facebook_pages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_pages' AND column_name = 'page_username') THEN
    ALTER TABLE facebook_pages ADD COLUMN page_username VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_pages' AND column_name = 'page_category') THEN
    ALTER TABLE facebook_pages ADD COLUMN page_category VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_pages' AND column_name = 'page_info') THEN
    ALTER TABLE facebook_pages ADD COLUMN page_info JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_pages' AND column_name = 'permissions') THEN
    ALTER TABLE facebook_pages ADD COLUMN permissions TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 4. Add missing columns to facebook_integrations
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_integrations' AND column_name = 'connection_status') THEN
    ALTER TABLE facebook_integrations ADD COLUMN connection_status VARCHAR DEFAULT 'connected';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_integrations' AND column_name = 'error_details') THEN
    ALTER TABLE facebook_integrations ADD COLUMN error_details JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_integrations' AND column_name = 'last_sync_at') THEN
    ALTER TABLE facebook_integrations ADD COLUMN last_sync_at TIMESTAMPTZ;
  END IF;
END $$;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_org_id ON facebook_lead_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_facebook_page_id ON facebook_lead_forms(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_org_id ON facebook_ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_integration_id ON facebook_ad_accounts(integration_id);

-- 6. Create helper function
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

-- 7. Create view
DROP VIEW IF EXISTS user_accessible_organizations;
CREATE VIEW user_accessible_organizations AS
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

-- 8. Grant permissions
GRANT SELECT ON user_accessible_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;

-- 9. Enable RLS
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies
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