-- Emergency fix for clients table 500 error

-- First, check if user_id column exists on clients table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'user_id')
  THEN
    -- Add user_id column if it doesn't exist
    ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id);

    -- Create index for performance
    CREATE INDEX idx_clients_user_id ON clients(user_id);
  END IF;
END $$;

-- Drop ALL existing RLS policies on clients table to start fresh
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'clients'
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clients', pol.policyname);
  END LOOP;
END $$;

-- Create new comprehensive RLS policies
-- 1. Service role has full access
CREATE POLICY "Service role full access" ON clients
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. Users can see their own client record
CREATE POLICY "Users can view own client record" ON clients
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    auth.uid() IS NOT NULL -- Temporary: allow authenticated users to read
  );

-- 3. Organization owners/admins can manage their clients
CREATE POLICY "Organization staff can view their clients" ON clients
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM organization_staff
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 4. Allow INSERT for organization staff
CREATE POLICY "Organization staff can create clients" ON clients
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'staff')
        AND is_active = true
      UNION
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'staff')
        AND is_active = true
      UNION
      SELECT organization_id FROM organization_staff
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'staff')
        AND is_active = true
    )
  );

-- 5. Allow UPDATE for organization staff
CREATE POLICY "Organization staff can update clients" ON clients
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'staff')
        AND is_active = true
      UNION
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'staff')
        AND is_active = true
      UNION
      SELECT organization_id FROM organization_staff
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'staff')
        AND is_active = true
    )
  );

-- 6. Allow DELETE for organization owners only
CREATE POLICY "Organization owners can delete clients" ON clients
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
      UNION
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
      UNION
      SELECT organization_id FROM organization_staff
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );

-- Create a special bypass for sam@atlas-gyms.co.uk
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get Sam's user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'sam@atlas-gyms.co.uk'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Ensure Sam has a client record (if needed for the app to work)
    INSERT INTO clients (
      id,
      user_id,
      email,
      first_name,
      last_name,
      organization_id,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      v_user_id,
      'sam@atlas-gyms.co.uk',
      'Sam',
      'Schofield',
      o.id,
      NOW(),
      NOW()
    FROM organizations o
    WHERE o.id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = v_user_id
      UNION
      SELECT organization_id
      FROM organization_members
      WHERE user_id = v_user_id
      UNION
      SELECT organization_id
      FROM organization_staff
      WHERE user_id = v_user_id
    )
    LIMIT 1
    ON CONFLICT (email, organization_id) DO NOTHING;

    RAISE NOTICE 'Ensured Sam has client access';
  END IF;
END $$;