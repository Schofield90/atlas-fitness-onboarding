-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- Price in pence
  billing_period VARCHAR(50) NOT NULL DEFAULT 'monthly', -- monthly, yearly, one-time
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 0,
  max_members INTEGER, -- NULL for unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_membership_plans_organization_id ON membership_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(organization_id, is_active);

-- Enable RLS
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view membership plans from their organization" ON membership_plans
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert membership plans for their organization" ON membership_plans
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update membership plans from their organization" ON membership_plans
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete membership plans from their organization" ON membership_plans
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_membership_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_plans_updated_at();