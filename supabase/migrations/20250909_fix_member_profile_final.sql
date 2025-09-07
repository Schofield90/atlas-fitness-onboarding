-- Comprehensive fix for member profile issues
-- This migration addresses both lead_tags and customer_notes constraints

-- 1. Fix lead_tags table - make lead_id nullable to support clients
ALTER TABLE lead_tags 
ALTER COLUMN lead_id DROP NOT NULL;

-- Add client_id column to lead_tags
ALTER TABLE lead_tags 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add constraint to ensure either lead_id or client_id is set
ALTER TABLE lead_tags 
DROP CONSTRAINT IF EXISTS check_lead_or_client_tags;

ALTER TABLE lead_tags 
ADD CONSTRAINT check_lead_or_client_tags 
CHECK (
  (lead_id IS NOT NULL AND client_id IS NULL) OR 
  (lead_id IS NULL AND client_id IS NOT NULL)
);

-- Add index for client_id
CREATE INDEX IF NOT EXISTS idx_lead_tags_client_id ON lead_tags(client_id);

-- 2. Ensure customer_notes table is properly configured
-- Check if customer_notes table exists and has the right structure
DO $$ 
BEGIN
  -- Add client_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_notes' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE customer_notes 
    ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;

  -- Make customer_id nullable if it isn't already
  ALTER TABLE customer_notes 
  ALTER COLUMN customer_id DROP NOT NULL;
END $$;

-- 3. Fix customer_memberships table (ensure previous migration was applied)
DO $$ 
BEGIN
  -- Make customer_id nullable if it isn't already
  ALTER TABLE customer_memberships 
  ALTER COLUMN customer_id DROP NOT NULL;
  
  -- Add client_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_memberships' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE customer_memberships 
    ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Update RLS policies for lead_tags
DROP POLICY IF EXISTS "Users can view lead tags from their organization" ON lead_tags;
DROP POLICY IF EXISTS "Users can create lead tags for their organization" ON lead_tags;
DROP POLICY IF EXISTS "Users can update lead tags in their organization" ON lead_tags;
DROP POLICY IF EXISTS "Users can delete lead tags from their organization" ON lead_tags;

CREATE POLICY "Users can view lead tags from their organization" ON lead_tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create lead tags for their organization" ON lead_tags
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can update lead tags in their organization" ON lead_tags
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete lead tags from their organization" ON lead_tags
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- 5. Ensure all constraint checks are in place
ALTER TABLE customer_notes 
DROP CONSTRAINT IF EXISTS check_customer_or_client_notes;

ALTER TABLE customer_notes 
ADD CONSTRAINT check_customer_or_client_notes 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL)
);

ALTER TABLE customer_memberships 
DROP CONSTRAINT IF EXISTS check_customer_or_client;

ALTER TABLE customer_memberships 
ADD CONSTRAINT check_customer_or_client 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_notes_client_id ON customer_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_organization_id ON customer_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_client_id ON customer_memberships(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_organization_id ON lead_tags(organization_id);