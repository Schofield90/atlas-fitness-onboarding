-- Migration: Automatic Facebook Leads to Contacts Sync
-- Description: Ensures Facebook leads automatically create corresponding contact records
-- Date: 2025-09-02

-- Function to automatically create or update contact when a lead is created/updated
CREATE OR REPLACE FUNCTION sync_lead_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_name_parts text[];
  v_existing_contact_id uuid;
  v_phone text;
  v_email text;
BEGIN
  -- Only process leads from Facebook that have been synced
  IF NEW.source != 'facebook' OR NEW.metadata IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract phone and email, handling 'Not provided' values
  v_phone := CASE 
    WHEN NEW.phone IS NOT NULL AND NEW.phone != 'Not provided' AND NEW.phone != '' 
    THEN NEW.phone 
    ELSE NULL 
  END;
  
  v_email := CASE 
    WHEN NEW.email IS NOT NULL AND NEW.email != 'Not provided' AND NEW.email != '' 
    THEN NEW.email 
    ELSE NULL 
  END;

  -- Skip if we have neither phone nor email
  IF v_phone IS NULL AND v_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Split name into first and last
  IF NEW.name IS NOT NULL AND NEW.name != '' AND NEW.name != 'Unknown' THEN
    v_name_parts := string_to_array(NEW.name, ' ');
    v_first_name := v_name_parts[1];
    IF array_length(v_name_parts, 1) > 1 THEN
      v_last_name := array_to_string(v_name_parts[2:], ' ');
    END IF;
  END IF;

  -- Check if contact already exists by phone or email
  IF v_phone IS NOT NULL THEN
    SELECT id INTO v_existing_contact_id
    FROM contacts
    WHERE phone = v_phone
    AND organization_id = NEW.organization_id
    LIMIT 1;
  END IF;

  IF v_existing_contact_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_existing_contact_id
    FROM contacts
    WHERE email = v_email
    AND organization_id = NEW.organization_id
    LIMIT 1;
  END IF;

  -- If contact exists, update it
  IF v_existing_contact_id IS NOT NULL THEN
    UPDATE contacts
    SET 
      lead_id = COALESCE(lead_id, NEW.id),
      first_name = COALESCE(first_name, v_first_name),
      last_name = COALESCE(last_name, v_last_name),
      email = COALESCE(email, v_email),
      phone = COALESCE(phone, v_phone),
      updated_at = NOW(),
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{last_synced_from_lead}',
        to_jsonb(NOW())
      )
    WHERE id = v_existing_contact_id;
    
    RAISE NOTICE 'Updated existing contact % for lead %', v_existing_contact_id, NEW.id;
  ELSE
    -- Create new contact
    INSERT INTO contacts (
      organization_id,
      lead_id,
      phone,
      email,
      first_name,
      last_name,
      sms_opt_in,
      whatsapp_opt_in,
      email_opt_in,
      tags,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      v_phone,
      v_email,
      v_first_name,
      v_last_name,
      true, -- Default opt-in for Facebook leads
      true,
      true,
      ARRAY[
        'facebook-lead',
        COALESCE(NEW.metadata->>'page_name', ''),
        COALESCE(NEW.metadata->>'form_name', '')
      ]::text[],
      jsonb_build_object(
        'source', 'facebook',
        'facebook_lead_id', NEW.metadata->>'facebook_lead_id',
        'form_name', NEW.metadata->>'form_name',
        'page_name', NEW.metadata->>'page_name',
        'imported_at', NOW(),
        'auto_created', true
      ),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created new contact for lead %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_sync_lead_to_contact ON leads;

-- Create trigger for automatic sync
CREATE TRIGGER auto_sync_lead_to_contact
AFTER INSERT OR UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION sync_lead_to_contact();

-- Function to batch sync existing Facebook leads that don't have contacts
CREATE OR REPLACE FUNCTION sync_existing_facebook_leads_to_contacts()
RETURNS TABLE(
  leads_processed int,
  contacts_created int,
  contacts_updated int
) AS $$
DECLARE
  v_lead RECORD;
  v_leads_processed int := 0;
  v_contacts_created int := 0;
  v_contacts_updated int := 0;
  v_first_name text;
  v_last_name text;
  v_name_parts text[];
  v_existing_contact_id uuid;
  v_phone text;
  v_email text;
BEGIN
  -- Process all Facebook leads that don't have corresponding contacts
  FOR v_lead IN 
    SELECT l.*
    FROM leads l
    WHERE l.source = 'facebook'
    AND l.metadata IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.lead_id = l.id
    )
    ORDER BY l.created_at DESC
  LOOP
    v_leads_processed := v_leads_processed + 1;
    
    -- Extract phone and email
    v_phone := CASE 
      WHEN v_lead.phone IS NOT NULL AND v_lead.phone != 'Not provided' AND v_lead.phone != '' 
      THEN v_lead.phone 
      ELSE NULL 
    END;
    
    v_email := CASE 
      WHEN v_lead.email IS NOT NULL AND v_lead.email != 'Not provided' AND v_lead.email != '' 
      THEN v_lead.email 
      ELSE NULL 
    END;

    -- Skip if no contact info
    IF v_phone IS NULL AND v_email IS NULL THEN
      CONTINUE;
    END IF;

    -- Split name
    IF v_lead.name IS NOT NULL AND v_lead.name != '' AND v_lead.name != 'Unknown' THEN
      v_name_parts := string_to_array(v_lead.name, ' ');
      v_first_name := v_name_parts[1];
      IF array_length(v_name_parts, 1) > 1 THEN
        v_last_name := array_to_string(v_name_parts[2:], ' ');
      END IF;
    END IF;

    -- Check for existing contact
    v_existing_contact_id := NULL;
    
    IF v_phone IS NOT NULL THEN
      SELECT id INTO v_existing_contact_id
      FROM contacts
      WHERE phone = v_phone
      AND organization_id = v_lead.organization_id
      LIMIT 1;
    END IF;

    IF v_existing_contact_id IS NULL AND v_email IS NOT NULL THEN
      SELECT id INTO v_existing_contact_id
      FROM contacts
      WHERE email = v_email
      AND organization_id = v_lead.organization_id
      LIMIT 1;
    END IF;

    -- Update or create contact
    IF v_existing_contact_id IS NOT NULL THEN
      UPDATE contacts
      SET 
        lead_id = v_lead.id,
        updated_at = NOW()
      WHERE id = v_existing_contact_id
      AND lead_id IS NULL;
      
      v_contacts_updated := v_contacts_updated + 1;
    ELSE
      INSERT INTO contacts (
        organization_id,
        lead_id,
        phone,
        email,
        first_name,
        last_name,
        sms_opt_in,
        whatsapp_opt_in,
        email_opt_in,
        tags,
        metadata
      ) VALUES (
        v_lead.organization_id,
        v_lead.id,
        v_phone,
        v_email,
        v_first_name,
        v_last_name,
        true,
        true,
        true,
        ARRAY[
          'facebook-lead',
          COALESCE(v_lead.metadata->>'page_name', ''),
          COALESCE(v_lead.metadata->>'form_name', '')
        ]::text[],
        jsonb_build_object(
          'source', 'facebook',
          'facebook_lead_id', v_lead.metadata->>'facebook_lead_id',
          'form_name', v_lead.metadata->>'form_name',
          'page_name', v_lead.metadata->>'page_name',
          'imported_at', NOW(),
          'auto_created_batch', true
        )
      );
      
      v_contacts_created := v_contacts_created + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_leads_processed, v_contacts_created, v_contacts_updated;
END;
$$ LANGUAGE plpgsql;

-- Create an index to improve performance of the sync
CREATE INDEX IF NOT EXISTS idx_leads_source_metadata 
ON leads(source, organization_id) 
WHERE source = 'facebook' AND metadata IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_lead_id 
ON contacts(lead_id) 
WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_phone_org 
ON contacts(phone, organization_id) 
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_email_org 
ON contacts(email, organization_id) 
WHERE email IS NOT NULL;

-- Add a scheduled job table to track sync status
CREATE TABLE IF NOT EXISTS facebook_sync_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  last_sync_at timestamptz,
  last_sync_lead_count int DEFAULT 0,
  last_sync_contact_count int DEFAULT 0,
  sync_errors jsonb,
  is_auto_sync_enabled boolean DEFAULT true,
  sync_frequency_minutes int DEFAULT 30,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create index for sync status
CREATE INDEX IF NOT EXISTS idx_facebook_sync_status_org 
ON facebook_sync_status(organization_id);

-- Add RLS policies for sync status
ALTER TABLE facebook_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's sync status"
ON facebook_sync_status FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their organization's sync status"
ON facebook_sync_status FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Run the batch sync for existing leads
-- Note: This will be executed when the migration runs
DO $$
DECLARE
  sync_result RECORD;
BEGIN
  SELECT * INTO sync_result FROM sync_existing_facebook_leads_to_contacts();
  RAISE NOTICE 'Batch sync completed: % leads processed, % contacts created, % contacts updated', 
    sync_result.leads_processed, 
    sync_result.contacts_created, 
    sync_result.contacts_updated;
END $$;

-- Add comment for documentation
COMMENT ON FUNCTION sync_lead_to_contact() IS 'Automatically creates or updates a contact record when a Facebook lead is inserted or updated';
COMMENT ON FUNCTION sync_existing_facebook_leads_to_contacts() IS 'Batch function to sync existing Facebook leads to contacts - can be called manually or via scheduled job';
COMMENT ON TABLE facebook_sync_status IS 'Tracks the status and configuration of Facebook lead sync operations for each organization';