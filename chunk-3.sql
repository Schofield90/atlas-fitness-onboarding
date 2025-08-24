-- Chunk 3: Indexes and RLS
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_org_id ON facebook_lead_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_facebook_page_id ON facebook_lead_forms(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_org_id ON facebook_ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_integration_id ON facebook_ad_accounts(integration_id);

ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;