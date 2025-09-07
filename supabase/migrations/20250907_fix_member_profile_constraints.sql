-- Fix customer_memberships to allow null customer_id when client_id is set
ALTER TABLE customer_memberships 
ALTER COLUMN customer_id DROP NOT NULL;

-- Ensure customer_notes has proper columns
ALTER TABLE customer_notes 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Drop and recreate constraint to allow either customer_id or client_id
ALTER TABLE customer_notes 
DROP CONSTRAINT IF EXISTS check_customer_or_client_notes;

ALTER TABLE customer_notes 
ADD CONSTRAINT check_customer_or_client_notes 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL)
);

-- Make customer_id nullable in customer_notes
ALTER TABLE customer_notes 
ALTER COLUMN customer_id DROP NOT NULL;

-- Add index for client_id in customer_notes
CREATE INDEX IF NOT EXISTS idx_customer_notes_client_id ON customer_notes(client_id);

-- Update RLS policies for customer_notes to handle both types
DROP POLICY IF EXISTS "Users can view notes from their organization" ON customer_notes;
DROP POLICY IF EXISTS "Users can create notes for their organization" ON customer_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON customer_notes;
DROP POLICY IF EXISTS "Users can delete notes based on role" ON customer_notes;

CREATE POLICY "Users can view notes from their organization" ON customer_notes
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create notes for their organization" ON customer_notes
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

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