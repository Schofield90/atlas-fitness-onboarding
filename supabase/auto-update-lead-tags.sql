-- Create lead_tags table if it doesn't exist
CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, tag_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag_id ON lead_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_organization_id ON lead_tags(organization_id);

-- Enable RLS
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view lead tags from their organization" ON lead_tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can manage lead tags in their organization" ON lead_tags
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

-- Function to update lead status tag based on membership
CREATE OR REPLACE FUNCTION update_lead_status_tag()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id UUID;
  v_lead_tag_id UUID;
  v_customer_tag_id UUID;
  v_ex_member_tag_id UUID;
  v_has_active_membership BOOLEAN;
BEGIN
  -- Get organization_id
  IF TG_TABLE_NAME = 'customer_memberships' THEN
    v_organization_id := COALESCE(NEW.organization_id, OLD.organization_id);
  END IF;

  -- Get tag IDs for 'Lead', 'Customer', and 'Ex Member'
  SELECT id INTO v_lead_tag_id FROM tags 
  WHERE organization_id = v_organization_id AND LOWER(name) = 'lead' LIMIT 1;
  
  SELECT id INTO v_customer_tag_id FROM tags 
  WHERE organization_id = v_organization_id AND LOWER(name) = 'customer' LIMIT 1;
  
  SELECT id INTO v_ex_member_tag_id FROM tags 
  WHERE organization_id = v_organization_id AND LOWER(name) = 'ex member' LIMIT 1;

  -- Create tags if they don't exist
  IF v_lead_tag_id IS NULL THEN
    INSERT INTO tags (organization_id, name, color) 
    VALUES (v_organization_id, 'Lead', '#6B7280')
    RETURNING id INTO v_lead_tag_id;
  END IF;

  IF v_customer_tag_id IS NULL THEN
    INSERT INTO tags (organization_id, name, color) 
    VALUES (v_organization_id, 'Customer', '#10B981')
    RETURNING id INTO v_customer_tag_id;
  END IF;

  IF v_ex_member_tag_id IS NULL THEN
    INSERT INTO tags (organization_id, name, color) 
    VALUES (v_organization_id, 'Ex Member', '#EF4444')
    RETURNING id INTO v_ex_member_tag_id;
  END IF;

  -- Check if customer has any active membership
  SELECT EXISTS (
    SELECT 1 FROM customer_memberships 
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ) INTO v_has_active_membership;

  -- Remove all status tags first
  DELETE FROM lead_tags 
  WHERE lead_id = COALESCE(NEW.customer_id, OLD.customer_id)
  AND tag_id IN (v_lead_tag_id, v_customer_tag_id, v_ex_member_tag_id);

  -- Add appropriate tag
  IF v_has_active_membership THEN
    -- Add Customer tag
    INSERT INTO lead_tags (organization_id, lead_id, tag_id)
    VALUES (v_organization_id, COALESCE(NEW.customer_id, OLD.customer_id), v_customer_tag_id)
    ON CONFLICT (lead_id, tag_id) DO NOTHING;
  ELSE
    -- Check if they ever had a membership
    IF EXISTS (
      SELECT 1 FROM customer_memberships 
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    ) THEN
      -- Add Ex Member tag
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_organization_id, COALESCE(NEW.customer_id, OLD.customer_id), v_ex_member_tag_id)
      ON CONFLICT (lead_id, tag_id) DO NOTHING;
    ELSE
      -- Add Lead tag
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_organization_id, COALESCE(NEW.customer_id, OLD.customer_id), v_lead_tag_id)
      ON CONFLICT (lead_id, tag_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for customer_memberships changes
DROP TRIGGER IF EXISTS update_lead_tag_on_membership_change ON customer_memberships;
CREATE TRIGGER update_lead_tag_on_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON customer_memberships
  FOR EACH ROW EXECUTE FUNCTION update_lead_status_tag();

-- Function to check and update expired memberships daily
CREATE OR REPLACE FUNCTION check_expired_memberships()
RETURNS void AS $$
BEGIN
  -- Update status to expired for memberships past their end date
  UPDATE customer_memberships
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
  AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize tags for existing leads
CREATE OR REPLACE FUNCTION initialize_lead_tags()
RETURNS void AS $$
DECLARE
  v_lead RECORD;
  v_org RECORD;
BEGIN
  -- Loop through all organizations
  FOR v_org IN SELECT DISTINCT organization_id FROM leads LOOP
    -- Create default tags for each organization
    INSERT INTO tags (organization_id, name, color) 
    VALUES 
      (v_org.organization_id, 'Lead', '#6B7280'),
      (v_org.organization_id, 'Customer', '#10B981'),
      (v_org.organization_id, 'Ex Member', '#EF4444')
    ON CONFLICT (organization_id, name) DO NOTHING;
  END LOOP;

  -- Loop through all leads and set appropriate tags
  FOR v_lead IN SELECT id, organization_id FROM leads LOOP
    -- Trigger will handle the logic
    PERFORM update_lead_status_tag() 
    FROM customer_memberships 
    WHERE customer_id = v_lead.id 
    LIMIT 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run initialization
SELECT initialize_lead_tags();