-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  type TEXT DEFAULT 'general' CHECK (type IN ('lead', 'customer', 'general')),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Create indexes
CREATE INDEX idx_tags_organization ON tags(organization_id);
CREATE INDEX idx_tags_type ON tags(type);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their organization's tags" ON tags
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create tags for their organization" ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update their organization's tags" ON tags
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete their organization's tags" ON tags
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create contact_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(contact_id, tag_id)
);

-- Create indexes
CREATE INDEX idx_contact_tags_contact ON contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag ON contact_tags(tag_id);

-- Enable RLS
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_tags
CREATE POLICY "Users can view their organization's contact tags" ON contact_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN user_organizations uo ON c.organization_id = uo.organization_id
      WHERE c.id = contact_tags.contact_id
        AND uo.user_id = auth.uid()
        AND uo.is_active = true
    )
  );

CREATE POLICY "Users can create contact tags for their organization" ON contact_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN user_organizations uo ON c.organization_id = uo.organization_id
      WHERE c.id = contact_id
        AND uo.user_id = auth.uid()
        AND uo.is_active = true
    )
  );

CREATE POLICY "Users can delete contact tags for their organization" ON contact_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN user_organizations uo ON c.organization_id = uo.organization_id
      WHERE c.id = contact_tags.contact_id
        AND uo.user_id = auth.uid()
        AND uo.is_active = true
    )
  );

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for usage count
CREATE TRIGGER update_tag_usage_count_trigger
AFTER INSERT OR DELETE ON contact_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_count();

-- Create updated_at trigger
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();