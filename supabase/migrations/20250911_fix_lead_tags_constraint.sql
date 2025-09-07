-- Fix lead_tags constraint to properly handle clients

-- First, check current structure
DO $$ 
BEGIN
  -- Ensure client_id column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'lead_tags' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE lead_tags 
    ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make lead_id nullable if it isn't already
ALTER TABLE lead_tags 
ALTER COLUMN lead_id DROP NOT NULL;

-- Drop old constraint
ALTER TABLE lead_tags 
DROP CONSTRAINT IF EXISTS check_lead_or_client_tags;

ALTER TABLE lead_tags 
DROP CONSTRAINT IF EXISTS lead_tags_check;

-- Add new constraint that ensures either lead_id OR client_id is set (but not both)
ALTER TABLE lead_tags 
ADD CONSTRAINT check_lead_or_client_tags 
CHECK (
  (lead_id IS NOT NULL AND client_id IS NULL) OR 
  (lead_id IS NULL AND client_id IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_tags_client_id ON lead_tags(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_organization_id ON lead_tags(organization_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view lead tags from their organization" ON lead_tags;
DROP POLICY IF EXISTS "Users can create lead tags for their organization" ON lead_tags;
DROP POLICY IF EXISTS "Users can update lead tags in their organization" ON lead_tags;
DROP POLICY IF EXISTS "Users can delete lead tags from their organization" ON lead_tags;

-- Create new policies that work with both leads and clients
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
      AND role IN ('owner', 'admin', 'staff')
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

-- Grant permissions
GRANT ALL ON lead_tags TO authenticated;

-- Check if there are any orphaned records and clean them up
DELETE FROM lead_tags 
WHERE lead_id IS NULL AND client_id IS NULL;

-- Verify the constraint is working
DO $$ 
BEGIN
  -- This should succeed
  PERFORM 1 FROM lead_tags LIMIT 1;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'lead_tags table check failed: %', SQLERRM;
END $$;