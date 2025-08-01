-- Cleanup duplicate status tags - each lead should only have ONE status tag

-- First, remove all Lead/Customer/Ex Member tags
DELETE FROM lead_tags 
WHERE tag_id IN (
  SELECT id FROM tags 
  WHERE LOWER(name) IN ('lead', 'customer', 'ex member')
);

-- Now re-apply the correct tags based on current membership status
DO $$
DECLARE
  v_lead RECORD;
  v_org_id UUID;
  v_lead_tag_id UUID;
  v_customer_tag_id UUID;
  v_ex_member_tag_id UUID;
  v_has_membership BOOLEAN;
  v_has_active_membership BOOLEAN;
BEGIN
  -- Process each lead
  FOR v_lead IN SELECT id, organization_id FROM leads LOOP
    v_org_id := v_lead.organization_id;
    
    -- Get tag IDs
    SELECT id INTO v_lead_tag_id FROM tags 
    WHERE organization_id = v_org_id AND name = 'Lead' LIMIT 1;
    
    SELECT id INTO v_customer_tag_id FROM tags 
    WHERE organization_id = v_org_id AND name = 'Customer' LIMIT 1;
    
    SELECT id INTO v_ex_member_tag_id FROM tags 
    WHERE organization_id = v_org_id AND name = 'Ex Member' LIMIT 1;
    
    -- Check membership status
    SELECT EXISTS(SELECT 1 FROM customer_memberships WHERE customer_id = v_lead.id)
    INTO v_has_membership;
    
    SELECT EXISTS(
      SELECT 1 FROM customer_memberships 
      WHERE customer_id = v_lead.id
      AND status = 'active'
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) INTO v_has_active_membership;
    
    -- Apply the correct tag (only one)
    IF v_has_active_membership THEN
      -- Active membership = Customer
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_org_id, v_lead.id, v_customer_tag_id)
      ON CONFLICT (lead_id, tag_id) DO NOTHING;
    ELSIF v_has_membership THEN
      -- Had membership but not active = Ex Member
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_org_id, v_lead.id, v_ex_member_tag_id)
      ON CONFLICT (lead_id, tag_id) DO NOTHING;
    ELSE
      -- Never had membership = Lead
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_org_id, v_lead.id, v_lead_tag_id)
      ON CONFLICT (lead_id, tag_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;