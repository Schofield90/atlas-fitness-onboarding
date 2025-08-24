-- Step 2: Add columns and indexes
-- Run this after step 1

ALTER TABLE facebook_pages 
  ADD COLUMN IF NOT EXISTS page_username VARCHAR,
  ADD COLUMN IF NOT EXISTS page_category VARCHAR,
  ADD COLUMN IF NOT EXISTS page_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

ALTER TABLE facebook_integrations
  ADD COLUMN IF NOT EXISTS connection_status VARCHAR DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS error_details JSONB,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_org_id ON facebook_lead_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_facebook_page_id ON facebook_lead_forms(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_org_id ON facebook_ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_integration_id ON facebook_ad_accounts(integration_id);