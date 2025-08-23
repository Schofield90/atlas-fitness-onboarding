-- Complete Facebook Integration Tables Setup
-- Run this to fix all Facebook-related database issues

-- 1. Ensure facebook_integrations table exists (already created earlier)
CREATE TABLE IF NOT EXISTS facebook_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facebook_user_id TEXT NOT NULL,
  facebook_user_name TEXT,
  facebook_user_email TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  granted_scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facebook_user_id)
);

-- 2. Create facebook_pages table
CREATE TABLE IF NOT EXISTS facebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  facebook_page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  page_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facebook_page_id)
);

-- 3. Create facebook_lead_forms table
CREATE TABLE IF NOT EXISTS facebook_lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_page_id TEXT NOT NULL,
  facebook_form_id TEXT NOT NULL,
  form_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facebook_form_id)
);

-- 4. Create facebook_ad_accounts table
CREATE TABLE IF NOT EXISTS facebook_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  currency TEXT,
  timezone_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, account_id)
);

-- 5. Create facebook_campaigns table
CREATE TABLE IF NOT EXISTS facebook_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  ad_account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  status TEXT,
  objective TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facebook_pages_org ON facebook_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_active ON facebook_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page ON facebook_lead_forms(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_org ON facebook_ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_org ON facebook_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_account ON facebook_campaigns(ad_account_id);

-- 7. Enable RLS on all tables
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_campaigns ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for facebook_pages
DROP POLICY IF EXISTS "Users can view organization pages" ON facebook_pages;
CREATE POLICY "Users can view organization pages"
  ON facebook_pages
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage organization pages" ON facebook_pages;
CREATE POLICY "Users can manage organization pages"
  ON facebook_pages
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- 9. Create RLS policies for facebook_lead_forms
DROP POLICY IF EXISTS "Users can view lead forms" ON facebook_lead_forms;
CREATE POLICY "Users can view lead forms"
  ON facebook_lead_forms
  FOR SELECT
  USING (
    facebook_page_id IN (
      SELECT facebook_page_id 
      FROM facebook_pages 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
      )
    )
  );

-- 10. Create RLS policies for facebook_ad_accounts
DROP POLICY IF EXISTS "Users can view organization ad accounts" ON facebook_ad_accounts;
CREATE POLICY "Users can view organization ad accounts"
  ON facebook_ad_accounts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage organization ad accounts" ON facebook_ad_accounts;
CREATE POLICY "Users can manage organization ad accounts"
  ON facebook_ad_accounts
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- 11. Create RLS policies for facebook_campaigns
DROP POLICY IF EXISTS "Users can view organization campaigns" ON facebook_campaigns;
CREATE POLICY "Users can view organization campaigns"
  ON facebook_campaigns
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- 12. Verify setup
SELECT 
  'facebook_integrations' as table_name, 
  COUNT(*) as row_count 
FROM facebook_integrations
UNION ALL
SELECT 
  'facebook_pages' as table_name, 
  COUNT(*) as row_count 
FROM facebook_pages
UNION ALL
SELECT 
  'facebook_ad_accounts' as table_name, 
  COUNT(*) as row_count 
FROM facebook_ad_accounts
UNION ALL
SELECT 
  'user_organizations' as table_name, 
  COUNT(*) as row_count 
FROM user_organizations
UNION ALL
SELECT 
  'organizations' as table_name, 
  COUNT(*) as row_count 
FROM organizations;