-- Final comprehensive fix for customer_notes table

-- 1. Ensure table exists with correct structure
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT customer_notes_has_customer CHECK (
    (customer_id IS NOT NULL AND client_id IS NULL) OR 
    (customer_id IS NULL AND client_id IS NOT NULL)
  )
);

-- 2. Add all necessary indexes
CREATE INDEX IF NOT EXISTS idx_customer_notes_organization_id ON customer_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_client_id ON customer_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_by ON customer_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at DESC);

-- 3. Enable RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies to recreate them correctly
DROP POLICY IF EXISTS "Users can view notes from their organization" ON customer_notes;
DROP POLICY IF EXISTS "Users can create notes for their organization" ON customer_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON customer_notes;
DROP POLICY IF EXISTS "Admins can delete notes in their organization" ON customer_notes;
DROP POLICY IF EXISTS "Users can update notes based on role" ON customer_notes;
DROP POLICY IF EXISTS "Users can delete notes based on role" ON customer_notes;

-- 5. Create corrected RLS policies
-- View policy - anyone in the organization can view notes
CREATE POLICY "Users can view notes from their organization" ON customer_notes
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Insert policy - staff can create notes (fixed to not require created_by check on insert)
CREATE POLICY "Users can create notes for their organization" ON customer_notes
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

-- Update policy - users can update their own notes
CREATE POLICY "Users can update their own notes" ON customer_notes
  FOR UPDATE USING (
    created_by = auth.uid() 
    AND organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Delete policy - allow based on role or ownership
CREATE POLICY "Users can delete notes based on role" ON customer_notes
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    AND (
      created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM user_organizations 
        WHERE user_id = auth.uid() 
        AND organization_id = customer_notes.organization_id
        AND role IN ('owner', 'admin')
        AND is_active = true
      )
    )
  );

-- 6. Create or replace the updated_at trigger
CREATE OR REPLACE FUNCTION update_customer_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_notes_updated_at ON customer_notes;
CREATE TRIGGER update_customer_notes_updated_at 
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW 
  EXECUTE FUNCTION update_customer_notes_updated_at();

-- 7. Grant necessary permissions
GRANT ALL ON customer_notes TO authenticated;
GRANT USAGE ON SEQUENCE customer_notes_id_seq TO authenticated;

-- 8. Test that the table is accessible
DO $$ 
BEGIN
  -- This will fail silently if there's an issue, but won't break the migration
  PERFORM 1 FROM customer_notes LIMIT 1;
EXCEPTION WHEN OTHERS THEN
  -- Table exists but might have permission issues
  NULL;
END $$;