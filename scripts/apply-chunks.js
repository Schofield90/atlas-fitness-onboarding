#!/usr/bin/env node

/**
 * Create SQL chunks for manual execution
 */

const fs = require('fs').promises;
const path = require('path');

async function createChunks() {
  console.log('🚀 Creating Facebook Migration Chunks');
  console.log('=' .repeat(60));
  
  // Split migration into chunks that can be executed separately
  const chunks = [
    // Chunk 1: Drop and create tables
    `-- Chunk 1: Create Tables
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
);`,
    
    // Chunk 2: Add columns
    `-- Chunk 2: Add Columns
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
END $$;`,
    
    // Chunk 3: Create indexes and enable RLS
    `-- Chunk 3: Indexes and RLS
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_org_id ON facebook_lead_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_facebook_page_id ON facebook_lead_forms(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_org_id ON facebook_ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_integration_id ON facebook_ad_accounts(integration_id);

ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;`,
    
    // Chunk 4: Create helper function and view
    `-- Chunk 4: Functions and Views
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

GRANT SELECT ON user_accessible_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;`
  ];
  
  // Write chunks to separate files
  for (let i = 0; i < chunks.length; i++) {
    const chunkFile = path.join(__dirname, `..`, `chunk-${i + 1}.sql`);
    await fs.writeFile(chunkFile, chunks[i]);
    console.log(`✅ Chunk ${i + 1} saved to: chunk-${i + 1}.sql`);
  }
  
  console.log('\n📋 Instructions:');
  console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
  console.log('2. Run each chunk file in order:');
  console.log('   - chunk-1.sql (Create Tables)');
  console.log('   - chunk-2.sql (Add Columns)');
  console.log('   - chunk-3.sql (Indexes and RLS)');
  console.log('   - chunk-4.sql (Functions and Views)');
  console.log('3. After all chunks complete, go to Facebook integration page');
  console.log('4. Click "Sync Pages from Facebook"');
  
  // Copy first chunk to clipboard
  try {
    const { exec } = require('child_process');
    exec(`cat "${path.join(__dirname, '..', 'chunk-1.sql')}" | pbcopy`);
    console.log('\n✅ Chunk 1 has been copied to your clipboard!');
    console.log('Paste it in the SQL editor and run it now.');
  } catch (err) {
    console.log('\n📋 Copy chunk 1 from: chunk-1.sql');
  }
}

createChunks().catch(console.error);