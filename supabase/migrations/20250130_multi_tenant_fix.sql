-- Migration to fix multi-tenant architecture for calendar system

-- 1. Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  subdomain VARCHAR UNIQUE,
  plan VARCHAR DEFAULT 'starter',
  status VARCHAR DEFAULT 'active',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_organizations junction table
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);

-- 4. Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for organizations
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
      AND is_active = true
    )
  );

-- 6. Create RLS policies for user_organizations
CREATE POLICY "Users can view their memberships" ON user_organizations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organization owners can manage memberships" ON user_organizations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid() 
      AND uo.role = 'owner'
      AND uo.is_active = true
    )
  );

-- 7. Update calendar_events RLS policies to use junction table
DROP POLICY IF EXISTS "Users can view organization events" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert organization events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update organization events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete organization events" ON calendar_events;

CREATE POLICY "Users can view organization events" ON calendar_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert organization events" ON calendar_events
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update organization events" ON calendar_events
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete organization events" ON calendar_events
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- 8. Create Atlas Fitness organization if it doesn't exist
INSERT INTO organizations (id, name, subdomain, plan, status)
VALUES (
  '63589490-8f55-4157-bd3a-e141594b748e',
  'Atlas Fitness',
  'atlas-fitness',
  'pro',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- 9. Migrate existing users with organization_id in metadata to user_organizations
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT 
  id as user_id,
  COALESCE(
    (raw_user_meta_data->>'organization_id')::uuid,
    '63589490-8f55-4157-bd3a-e141594b748e'::uuid
  ) as organization_id,
  'owner' as role
FROM auth.users
WHERE id IN (
  SELECT DISTINCT created_by FROM calendar_events
  UNION
  SELECT DISTINCT user_id FROM google_calendar_tokens
)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- 10. Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_organizations_updated_at BEFORE UPDATE ON user_organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();