-- Create membership_plans table with correct schema
-- This fixes the "Could not find the 'price_amount' column" error

-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- Price in pence/cents
  billing_period VARCHAR(50) NOT NULL DEFAULT 'monthly', -- monthly, yearly, one-time
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 0,
  max_members INTEGER, -- NULL for unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_membership_plans_organization_id ON membership_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(organization_id, is_active);

-- Enable Row Level Security
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization-based access
DROP POLICY IF EXISTS "Users can view membership plans from their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can insert membership plans for their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can update membership plans from their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can delete membership plans from their organization" ON membership_plans;

CREATE POLICY "Users can view membership plans from their organization"
ON membership_plans FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
    UNION
    SELECT id FROM organizations 
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert membership plans for their organization"
ON membership_plans FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
    UNION
    SELECT id FROM organizations 
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update membership plans from their organization"
ON membership_plans FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
    UNION
    SELECT id FROM organizations 
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete membership plans from their organization"
ON membership_plans FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
    UNION
    SELECT id FROM organizations 
    WHERE owner_id = auth.uid()
  )
);

-- Grant permissions
GRANT ALL ON membership_plans TO authenticated;
GRANT ALL ON membership_plans TO service_role;

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_membership_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_membership_plans_updated_at ON membership_plans;
CREATE TRIGGER trigger_update_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_plans_updated_at();

-- Insert some default membership plans for Atlas Fitness
INSERT INTO membership_plans (organization_id, name, description, price, billing_period, features, is_active)
VALUES 
  (
    '63589490-8f55-4157-bd3a-e141594b748e', 
    'Basic Membership', 
    'Access to gym facilities during standard hours', 
    2999, 
    'monthly', 
    '["Gym access", "Locker use", "Basic equipment"]'::jsonb, 
    true
  ),
  (
    '63589490-8f55-4157-bd3a-e141594b748e', 
    'Premium Membership', 
    'Full access plus group classes and personal training discounts', 
    4999, 
    'monthly', 
    '["Gym access", "Group classes", "Locker use", "PT discount", "Guest passes"]'::jsonb, 
    true
  ),
  (
    '63589490-8f55-4157-bd3a-e141594b748e', 
    'Annual Membership', 
    'Full year membership with significant savings', 
    49990, 
    'yearly', 
    '["Gym access", "Group classes", "Locker use", "PT discount", "Guest passes", "Priority booking"]'::jsonb, 
    true
  )
ON CONFLICT DO NOTHING;

-- Verify the table was created successfully
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'membership_plans'
ORDER BY tablename;

-- Show sample data
SELECT id, name, price, billing_period, is_active 
FROM membership_plans 
LIMIT 5;