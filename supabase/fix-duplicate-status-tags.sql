-- First, update the trigger function to ALWAYS remove old status tags before adding new ones
CREATE OR REPLACE FUNCTION update_lead_status_tag()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id UUID;
  v_lead_tag_id UUID;
  v_customer_tag_id UUID;
  v_ex_member_tag_id UUID;
  v_has_active_membership BOOLEAN;
  v_customer_id UUID;
BEGIN
  -- Get the customer_id and organization_id
  IF TG_OP = 'DELETE' THEN
    v_customer_id := OLD.customer_id;
    v_organization_id := OLD.organization_id;
  ELSE
    v_customer_id := NEW.customer_id;
    v_organization_id := NEW.organization_id;
  END IF;

  -- Get all status tag IDs for this organization
  SELECT id INTO v_lead_tag_id FROM tags 
  WHERE organization_id = v_organization_id AND name = 'Lead' LIMIT 1;
  
  SELECT id INTO v_customer_tag_id FROM tags 
  WHERE organization_id = v_organization_id AND name = 'Customer' LIMIT 1;
  
  SELECT id INTO v_ex_member_tag_id FROM tags 
  WHERE organization_id = v_organization_id AND name = 'Ex Member' LIMIT 1;

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

  -- IMPORTANT: Remove ALL status tags first
  DELETE FROM lead_tags 
  WHERE lead_id = v_customer_id
  AND tag_id IN (v_lead_tag_id, v_customer_tag_id, v_ex_member_tag_id);

  -- Check if customer has any active membership
  SELECT EXISTS (
    SELECT 1 FROM customer_memberships 
    WHERE customer_id = v_customer_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ) INTO v_has_active_membership;

  -- Add the appropriate tag (only one)
  IF v_has_active_membership THEN
    -- Active membership = Customer
    INSERT INTO lead_tags (organization_id, lead_id, tag_id)
    VALUES (v_organization_id, v_customer_id, v_customer_tag_id);
  ELSE
    -- Check if they ever had a membership
    IF EXISTS (
      SELECT 1 FROM customer_memberships 
      WHERE customer_id = v_customer_id
    ) THEN
      -- Had membership but not active = Ex Member
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_organization_id, v_customer_id, v_ex_member_tag_id);
    ELSE
      -- Never had membership = Lead
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_organization_id, v_customer_id, v_lead_tag_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up all existing duplicate tags
DELETE FROM lead_tags 
WHERE tag_id IN (
  SELECT id FROM tags 
  WHERE name IN ('Lead', 'Customer', 'Ex Member')
);

-- Re-run the initialization to apply correct tags
DO $$
DECLARE
  v_lead RECORD;
  v_org_id UUID;
  v_lead_tag_id UUID;
  v_customer_tag_id UUID;
  v_ex_member_tag_id UUID;
  v_has_active_membership BOOLEAN;
BEGIN
  FOR v_lead IN SELECT id, organization_id FROM leads LOOP
    v_org_id := v_lead.organization_id;
    
    SELECT id INTO v_lead_tag_id FROM tags 
    WHERE organization_id = v_org_id AND name = 'Lead' LIMIT 1;
    
    SELECT id INTO v_customer_tag_id FROM tags 
    WHERE organization_id = v_org_id AND name = 'Customer' LIMIT 1;
    
    SELECT id INTO v_ex_member_tag_id FROM tags 
    WHERE organization_id = v_org_id AND name = 'Ex Member' LIMIT 1;
    
    SELECT EXISTS(
      SELECT 1 FROM customer_memberships 
      WHERE customer_id = v_lead.id
      AND status = 'active'
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) INTO v_has_active_membership;
    
    IF v_has_active_membership THEN
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_org_id, v_lead.id, v_customer_tag_id);
    ELSIF EXISTS(SELECT 1 FROM customer_memberships WHERE customer_id = v_lead.id) THEN
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_org_id, v_lead.id, v_ex_member_tag_id);
    ELSE
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_org_id, v_lead.id, v_lead_tag_id);
    END IF;
  END LOOP;
END $$;