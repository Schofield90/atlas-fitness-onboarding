-- Fix the update_lead_status_tag trigger to handle both leads and clients

-- First ensure lead_tags table can handle clients
DO $$ 
BEGIN
  -- Add client_id column if it doesn't exist
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

-- Make lead_id nullable
ALTER TABLE lead_tags 
ALTER COLUMN lead_id DROP NOT NULL;

-- Drop and recreate the constraint
ALTER TABLE lead_tags 
DROP CONSTRAINT IF EXISTS check_lead_or_client_tags;

ALTER TABLE lead_tags 
ADD CONSTRAINT check_lead_or_client_tags 
CHECK (
  (lead_id IS NOT NULL AND client_id IS NULL) OR 
  (lead_id IS NULL AND client_id IS NOT NULL)
);

-- Drop the existing trigger function and recreate it to handle both leads and clients
CREATE OR REPLACE FUNCTION update_lead_status_tag()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id UUID;
  v_lead_tag_id UUID;
  v_customer_tag_id UUID;
  v_ex_member_tag_id UUID;
  v_has_active_membership BOOLEAN;
  v_customer_id UUID;
  v_client_id UUID;
  v_is_client BOOLEAN := FALSE;
BEGIN
  -- Get organization_id and determine if it's a client or lead
  IF TG_TABLE_NAME = 'customer_memberships' THEN
    v_organization_id := COALESCE(NEW.organization_id, OLD.organization_id);
    v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
    v_client_id := COALESCE(NEW.client_id, OLD.client_id);
    
    -- Determine if this is a client or lead
    IF v_client_id IS NOT NULL THEN
      v_is_client := TRUE;
    END IF;
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
    ON CONFLICT (organization_id, name) DO NOTHING
    RETURNING id INTO v_lead_tag_id;
  END IF;

  IF v_customer_tag_id IS NULL THEN
    INSERT INTO tags (organization_id, name, color) 
    VALUES (v_organization_id, 'Customer', '#10B981')
    ON CONFLICT (organization_id, name) DO NOTHING
    RETURNING id INTO v_customer_tag_id;
  END IF;

  IF v_ex_member_tag_id IS NULL THEN
    INSERT INTO tags (organization_id, name, color) 
    VALUES (v_organization_id, 'Ex Member', '#EF4444')
    ON CONFLICT (organization_id, name) DO NOTHING
    RETURNING id INTO v_ex_member_tag_id;
  END IF;

  -- Check if customer has any active membership
  IF v_is_client THEN
    -- Check for client memberships
    SELECT EXISTS (
      SELECT 1 FROM customer_memberships 
      WHERE client_id = v_client_id
      AND status = 'active'
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) INTO v_has_active_membership;
  ELSE
    -- Check for lead memberships
    SELECT EXISTS (
      SELECT 1 FROM customer_memberships 
      WHERE customer_id = v_customer_id
      AND status = 'active'
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) INTO v_has_active_membership;
  END IF;

  -- Remove all status tags first
  IF v_is_client THEN
    DELETE FROM lead_tags 
    WHERE client_id = v_client_id
    AND tag_id IN (v_lead_tag_id, v_customer_tag_id, v_ex_member_tag_id);
  ELSE
    DELETE FROM lead_tags 
    WHERE lead_id = v_customer_id
    AND tag_id IN (v_lead_tag_id, v_customer_tag_id, v_ex_member_tag_id);
  END IF;

  -- Add appropriate tag
  IF v_has_active_membership THEN
    -- Add Customer tag
    IF v_is_client THEN
      INSERT INTO lead_tags (organization_id, client_id, tag_id)
      VALUES (v_organization_id, v_client_id, v_customer_tag_id)
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO lead_tags (organization_id, lead_id, tag_id)
      VALUES (v_organization_id, v_customer_id, v_customer_tag_id)
      ON CONFLICT (lead_id, tag_id) DO NOTHING;
    END IF;
  ELSE
    -- Check if they ever had a membership
    IF v_is_client THEN
      IF EXISTS (
        SELECT 1 FROM customer_memberships 
        WHERE client_id = v_client_id
      ) THEN
        -- Add Ex Member tag
        INSERT INTO lead_tags (organization_id, client_id, tag_id)
        VALUES (v_organization_id, v_client_id, v_ex_member_tag_id)
        ON CONFLICT DO NOTHING;
      ELSE
        -- Add Lead tag
        INSERT INTO lead_tags (organization_id, client_id, tag_id)
        VALUES (v_organization_id, v_client_id, v_lead_tag_id)
        ON CONFLICT DO NOTHING;
      END IF;
    ELSE
      IF EXISTS (
        SELECT 1 FROM customer_memberships 
        WHERE customer_id = v_customer_id
      ) THEN
        -- Add Ex Member tag
        INSERT INTO lead_tags (organization_id, lead_id, tag_id)
        VALUES (v_organization_id, v_customer_id, v_ex_member_tag_id)
        ON CONFLICT (lead_id, tag_id) DO NOTHING;
      ELSE
        -- Add Lead tag
        INSERT INTO lead_tags (organization_id, lead_id, tag_id)
        VALUES (v_organization_id, v_customer_id, v_lead_tag_id)
        ON CONFLICT (lead_id, tag_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint for client_id and tag_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lead_tags_client_id_tag_id_key'
  ) THEN
    ALTER TABLE lead_tags 
    ADD CONSTRAINT lead_tags_client_id_tag_id_key 
    UNIQUE(client_id, tag_id);
  END IF;
END $$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_lead_tag_on_membership_change ON customer_memberships;
CREATE TRIGGER update_lead_tag_on_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON customer_memberships
  FOR EACH ROW EXECUTE FUNCTION update_lead_status_tag();

-- Grant permissions
GRANT ALL ON lead_tags TO authenticated;
GRANT ALL ON tags TO authenticated;