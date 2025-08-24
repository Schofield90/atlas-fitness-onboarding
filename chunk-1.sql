-- Chunk 1: Create Tables
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