#!/bin/bash

# This script applies the Facebook sync migration in small chunks
# Run each chunk separately in Supabase SQL editor

echo "========================================="
echo "Facebook Leads Auto-Sync Migration"
echo "Run each chunk in Supabase SQL Editor"
echo "========================================="
echo ""

cat << 'CHUNK1'
-- CHUNK 1: Create the sync function
-- Run this first
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
  IF NEW.source != 'facebook' OR NEW.metadata IS NULL THEN
    RETURN NEW;
  END IF;

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

  IF v_phone IS NULL AND v_email IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.name IS NOT NULL AND NEW.name != '' AND NEW.name != 'Unknown' THEN
    v_name_parts := string_to_array(NEW.name, ' ');
    v_first_name := v_name_parts[1];
    IF array_length(v_name_parts, 1) > 1 THEN
      v_last_name := array_to_string(v_name_parts[2:], ' ');
    END IF;
  END IF;

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
      true,
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CHUNK1

echo ""
echo "========================================="
echo ""

cat << 'CHUNK2'
-- CHUNK 2: Create the trigger
-- Run this second
DROP TRIGGER IF EXISTS auto_sync_lead_to_contact ON leads;

CREATE TRIGGER auto_sync_lead_to_contact
AFTER INSERT OR UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION sync_lead_to_contact();
CHUNK2

echo ""
echo "========================================="
echo ""

cat << 'CHUNK3'
-- CHUNK 3: Create indexes
-- Run this third
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
CHUNK3

echo ""
echo "========================================="
echo ""

cat << 'CHUNK4'
-- CHUNK 4: Create sync status table
-- Run this fourth
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

CREATE INDEX IF NOT EXISTS idx_facebook_sync_status_org 
ON facebook_sync_status(organization_id);

ALTER TABLE facebook_sync_status ENABLE ROW LEVEL SECURITY;
CHUNK4

echo ""
echo "========================================="
echo ""

cat << 'CHUNK5'
-- CHUNK 5: Create RLS policies
-- Run this fifth
CREATE POLICY "Users can view their organization sync status"
ON facebook_sync_status FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their organization sync status"
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
CHUNK5

echo ""
echo "========================================="
echo ""

cat << 'CHUNK6'
-- CHUNK 6: Create batch sync function (Part 1 - Function header)
-- Run this sixth
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
    LIMIT 100  -- Process in batches of 100
  LOOP
    v_leads_processed := v_leads_processed + 1;
    
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

    IF v_phone IS NULL AND v_email IS NULL THEN
      CONTINUE;
    END IF;

    IF v_lead.name IS NOT NULL AND v_lead.name != '' AND v_lead.name != 'Unknown' THEN
      v_name_parts := string_to_array(v_lead.name, ' ');
      v_first_name := v_name_parts[1];
      IF array_length(v_name_parts, 1) > 1 THEN
        v_last_name := array_to_string(v_name_parts[2:], ' ');
      END IF;
    END IF;

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

    IF v_existing_contact_id IS NOT NULL THEN
      UPDATE contacts
      SET 
        lead_id = v_lead.id,
        updated_at = NOW()
      WHERE id = v_existing_contact_id
      AND lead_id IS NULL;
      
      IF FOUND THEN
        v_contacts_updated := v_contacts_updated + 1;
      END IF;
    ELSE
      BEGIN
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
          ARRAY['facebook-lead']::text[],
          jsonb_build_object(
            'source', 'facebook',
            'imported_at', NOW()
          )
        );
        
        v_contacts_created := v_contacts_created + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Skip on error
        NULL;
      END;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_leads_processed, v_contacts_created, v_contacts_updated;
END;
$$ LANGUAGE plpgsql;
CHUNK6

echo ""
echo "========================================="
echo ""

cat << 'CHUNK7'
-- CHUNK 7: Run initial sync (OPTIONAL - only if you want to sync existing leads)
-- This will sync up to 100 existing Facebook leads
SELECT * FROM sync_existing_facebook_leads_to_contacts();
CHUNK7

echo ""
echo "========================================="
echo "DONE! Run each chunk above in order in Supabase SQL Editor"
echo "========================================="