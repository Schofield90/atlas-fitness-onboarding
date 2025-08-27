-- Add sync_config JSONB column to facebook_integrations if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facebook_integrations' 
    AND column_name = 'sync_config'
  ) THEN
    ALTER TABLE facebook_integrations 
    ADD COLUMN sync_config JSONB;
  END IF;
END $$;

-- Create facebook_sync_configs table if it doesn't exist
CREATE TABLE IF NOT EXISTS facebook_sync_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facebook_integration_id UUID REFERENCES facebook_integrations(id) ON DELETE CASCADE,
  selected_pages TEXT[] DEFAULT '{}',
  selected_ad_accounts TEXT[] DEFAULT '{}',
  selected_forms TEXT[] DEFAULT '{}',
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on facebook_sync_configs
ALTER TABLE facebook_sync_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for facebook_sync_configs
CREATE POLICY "Users can view their organization's Facebook sync configs"
  ON facebook_sync_configs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization's Facebook sync configs"
  ON facebook_sync_configs
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_facebook_sync_configs_org_id 
  ON facebook_sync_configs(organization_id);

-- Add unique constraint to prevent duplicate configs per organization
ALTER TABLE facebook_sync_configs 
  ADD CONSTRAINT unique_facebook_sync_config_per_org 
  UNIQUE (organization_id);