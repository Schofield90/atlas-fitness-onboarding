-- Create user_organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Create organizations table if missing
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default organization if it doesn't exist
INSERT INTO organizations (id, name, slug)
VALUES ('63589490-8f55-4157-bd3a-e141594b748e', 'Atlas Fitness', 'atlas-fitness')
ON CONFLICT (id) DO NOTHING;

-- Get user IDs
DO $$
DECLARE
  sam_atlas_id UUID;
  sam_hotmail_id UUID;
BEGIN
  -- Get sam@atlas-gyms.co.uk user ID
  SELECT id INTO sam_atlas_id
  FROM auth.users
  WHERE email = 'sam@atlas-gyms.co.uk'
  LIMIT 1;

  -- Get samschofield90@hotmail.co.uk user ID
  SELECT id INTO sam_hotmail_id
  FROM auth.users
  WHERE email = 'samschofield90@hotmail.co.uk'
  LIMIT 1;

  -- Insert user_organizations entries if users exist
  IF sam_atlas_id IS NOT NULL THEN
    INSERT INTO user_organizations (user_id, organization_id, role, is_active)
    VALUES (sam_atlas_id, '63589490-8f55-4157-bd3a-e141594b748e', 'owner', true)
    ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = 'owner', is_active = true;
  END IF;

  IF sam_hotmail_id IS NOT NULL THEN
    INSERT INTO user_organizations (user_id, organization_id, role, is_active)
    VALUES (sam_hotmail_id, '63589490-8f55-4157-bd3a-e141594b748e', 'owner', true)
    ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = 'owner', is_active = true;
  END IF;
END $$;

-- Enable RLS on user_organizations
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own organizations" ON user_organizations;
DROP POLICY IF EXISTS "Users can insert their own organizations" ON user_organizations;

-- Create RLS policies
CREATE POLICY "Users can view their own organizations"
  ON user_organizations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organizations"
  ON user_organizations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verify the setup
SELECT 
  u.email,
  uo.organization_id,
  uo.role,
  o.name as org_name
FROM auth.users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
LEFT JOIN organizations o ON uo.organization_id = o.id
WHERE u.email IN ('sam@atlas-gyms.co.uk', 'samschofield90@hotmail.co.uk');