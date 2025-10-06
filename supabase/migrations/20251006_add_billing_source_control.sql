-- Add billing source control to prevent double billing during migration
-- Allows running GoTeamUp and CRM side-by-side safely

-- Add billing source tracking to customer_memberships
ALTER TABLE customer_memberships
ADD COLUMN IF NOT EXISTS billing_source VARCHAR(50) DEFAULT 'goteamup',
ADD COLUMN IF NOT EXISTS billing_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_paused_reason TEXT,
ADD COLUMN IF NOT EXISTS billing_paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_paused_by UUID REFERENCES auth.users(id);

-- Add comments
COMMENT ON COLUMN customer_memberships.billing_source IS 'Which system handles billing: goteamup, crm, stripe, gocardless';
COMMENT ON COLUMN customer_memberships.billing_paused IS 'If true, CRM will NOT trigger any charges';
COMMENT ON COLUMN customer_memberships.billing_paused_reason IS 'Why billing is paused (e.g., "Migrating from GoTeamUp", "Payment issue")';
COMMENT ON COLUMN customer_memberships.billing_paused_at IS 'When billing was paused';
COMMENT ON COLUMN customer_memberships.billing_paused_by IS 'Staff member who paused billing';

-- Add organization-level billing control
CREATE TABLE IF NOT EXISTS organization_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Billing mode for entire organization
  billing_mode VARCHAR(50) DEFAULT 'goteamup' CHECK (billing_mode IN ('goteamup', 'crm', 'hybrid')),

  -- Safety settings
  require_manual_approval BOOLEAN DEFAULT true,
  allow_auto_billing BOOLEAN DEFAULT false,

  -- Migration tracking
  migration_started_at TIMESTAMPTZ,
  migration_completed_at TIMESTAMPTZ,
  migration_status VARCHAR(50) DEFAULT 'not_started' CHECK (migration_status IN ('not_started', 'in_progress', 'completed', 'rolled_back')),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

COMMENT ON TABLE organization_billing_settings IS 'Controls billing behavior during migration from GoTeamUp';
COMMENT ON COLUMN organization_billing_settings.billing_mode IS 'goteamup = GoTeamUp handles all billing (CRM disabled), crm = CRM handles all billing, hybrid = per-client control';
COMMENT ON COLUMN organization_billing_settings.require_manual_approval IS 'If true, all charges require manual approval before processing';
COMMENT ON COLUMN organization_billing_settings.allow_auto_billing IS 'If false, CRM will never auto-charge (safety mode)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_customer_memberships_billing_source
ON customer_memberships(billing_source, billing_paused);

CREATE INDEX IF NOT EXISTS idx_org_billing_settings_mode
ON organization_billing_settings(organization_id, billing_mode);

-- Insert default settings for existing organizations
INSERT INTO organization_billing_settings (organization_id, billing_mode, require_manual_approval, allow_auto_billing, migration_status)
SELECT id, 'goteamup', true, false, 'not_started'
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Add RLS policies
ALTER TABLE organization_billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org billing settings"
ON organization_billing_settings FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Owners/Admins can manage billing settings"
ON organization_billing_settings FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
