-- Create customer_notes table
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customer_notes_organization_id ON customer_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_client_id ON customer_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_by ON customer_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at DESC);

-- Enable RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own notes" ON customer_notes
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can delete notes in their organization" ON customer_notes
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_customer_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_notes_updated_at 
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW 
  EXECUTE FUNCTION update_customer_notes_updated_at();