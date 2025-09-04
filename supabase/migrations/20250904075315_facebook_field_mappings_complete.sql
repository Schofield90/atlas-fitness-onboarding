-- Facebook Field Mappings Complete System
-- This migration ensures the field mapping system is fully configured

-- Ensure the facebook_lead_forms table has all necessary columns
ALTER TABLE facebook_lead_forms 
ADD COLUMN IF NOT EXISTS field_mappings JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_field_mappings JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS field_mappings_configured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS field_mappings_version VARCHAR(20) DEFAULT '1.0';

-- Create an index for faster field mapping lookups
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_field_mappings 
ON facebook_lead_forms USING GIN (field_mappings);

-- Create a view for active forms with field mappings
CREATE OR REPLACE VIEW facebook_forms_with_mappings AS
SELECT 
  flf.id,
  flf.organization_id,
  flf.facebook_form_id,
  flf.form_name,
  flf.facebook_page_id,
  flf.is_active,
  flf.field_mappings,
  flf.custom_field_mappings,
  flf.field_mappings_configured,
  flf.questions,
  fp.page_name,
  fp.facebook_page_id as page_fb_id,
  COUNT(fl.id) as total_leads_processed,
  MAX(fl.created_at) as last_lead_received
FROM facebook_lead_forms flf
LEFT JOIN facebook_pages fp ON flf.page_id = fp.id
LEFT JOIN facebook_leads fl ON flf.id = fl.form_id
WHERE flf.is_active = true
GROUP BY 
  flf.id, flf.organization_id, flf.facebook_form_id, flf.form_name, 
  flf.facebook_page_id, flf.is_active, flf.field_mappings, 
  flf.custom_field_mappings, flf.field_mappings_configured, 
  flf.questions, fp.page_name, fp.facebook_page_id;

-- Function to validate field mappings
CREATE OR REPLACE FUNCTION validate_field_mappings(mappings JSONB)
RETURNS JSONB AS $$
DECLARE
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
  has_email BOOLEAN := false;
  has_contact_info BOOLEAN := false;
BEGIN
  -- Check if mappings exist
  IF mappings IS NULL OR mappings = '{}'::jsonb THEN
    errors := array_append(errors, 'No field mappings configured');
    RETURN jsonb_build_object('valid', false, 'errors', errors, 'warnings', warnings);
  END IF;

  -- Check for email mapping
  IF mappings->'mappings' IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(mappings->'mappings') - 1 LOOP
      IF mappings->'mappings'->i->>'crm_field' = 'email' THEN
        has_email := true;
      END IF;
      IF mappings->'mappings'->i->>'crm_field' IN ('email', 'phone', 'first_name', 'last_name') THEN
        has_contact_info := true;
      END IF;
    END LOOP;
  END IF;

  -- Add warnings
  IF NOT has_email THEN
    warnings := array_append(warnings, 'No email field mapped - leads may be harder to identify');
  END IF;
  
  IF NOT has_contact_info THEN
    errors := array_append(errors, 'At least one contact field (email, phone, name) must be mapped');
  END IF;

  RETURN jsonb_build_object(
    'valid', array_length(errors, 1) = 0,
    'errors', errors,
    'warnings', warnings
  );
END;
$$ LANGUAGE plpgsql;

-- Function to apply field mappings to lead data
CREATE OR REPLACE FUNCTION apply_field_mappings(
  lead_data JSONB,
  field_mappings JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB := '{"standard_fields": {}, "custom_fields": {}}'::jsonb;
  mapping JSONB;
  field_value TEXT;
  transformed_value TEXT;
BEGIN
  -- Process standard field mappings
  IF field_mappings->'mappings' IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(field_mappings->'mappings') - 1 LOOP
      mapping := field_mappings->'mappings'->i;
      
      -- Extract field value from lead data
      FOR j IN 0..jsonb_array_length(lead_data) - 1 LOOP
        IF lead_data->j->>'name' = mapping->>'facebook_field_name' THEN
          field_value := lead_data->j->'values'->0;
          IF field_value IS NULL THEN
            field_value := lead_data->j->>'value';
          END IF;
          
          -- Apply transformation if specified
          transformed_value := field_value;
          IF mapping->'transformation' IS NOT NULL THEN
            -- Apply transformation based on type
            CASE mapping->'transformation'->>'type'
              WHEN 'phone_format' THEN
                -- Remove non-numeric characters
                transformed_value := regexp_replace(field_value, '[^0-9+]', '', 'g');
              WHEN 'text' THEN
                transformed_value := trim(field_value);
              ELSE
                transformed_value := field_value;
            END CASE;
          END IF;
          
          -- Store in appropriate field type
          IF mapping->>'crm_field_type' = 'standard' THEN
            result := jsonb_set(
              result,
              array['standard_fields', mapping->>'crm_field'],
              to_jsonb(transformed_value)
            );
          ELSE
            result := jsonb_set(
              result,
              array['custom_fields', mapping->>'crm_field'],
              to_jsonb(transformed_value)
            );
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  
  -- Process custom field mappings
  IF field_mappings->'custom_mappings' IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(field_mappings->'custom_mappings') - 1 LOOP
      mapping := field_mappings->'custom_mappings'->i;
      
      -- Extract and store custom field value
      FOR j IN 0..jsonb_array_length(lead_data) - 1 LOOP
        IF lead_data->j->>'name' = mapping->>'facebook_field_name' THEN
          field_value := lead_data->j->'values'->0;
          IF field_value IS NULL THEN
            field_value := lead_data->j->>'value';
          END IF;
          
          result := jsonb_set(
            result,
            array['custom_fields', mapping->>'custom_field_name'],
            to_jsonb(field_value)
          );
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for field mappings
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;

-- Policy for viewing field mappings (organization members only)
CREATE POLICY "Organization members can view field mappings"
  ON facebook_lead_forms
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for updating field mappings (organization admins only)
CREATE POLICY "Organization admins can update field mappings"
  ON facebook_lead_forms
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Create a trigger to auto-detect field mappings when a form is first saved
CREATE OR REPLACE FUNCTION auto_detect_field_mappings()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-detect if no mappings exist and questions are available
  IF NEW.field_mappings IS NULL AND NEW.questions IS NOT NULL AND jsonb_array_length(NEW.questions) > 0 THEN
    -- This is a placeholder - actual auto-detection happens in the application layer
    -- But we can set a flag to indicate auto-detection is needed
    NEW.field_mappings_configured := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_detect_mappings_trigger
BEFORE INSERT OR UPDATE ON facebook_lead_forms
FOR EACH ROW
EXECUTE FUNCTION auto_detect_field_mappings();

-- Add comment documentation
COMMENT ON COLUMN facebook_lead_forms.field_mappings IS 'JSON structure containing field mapping configuration between Facebook form fields and CRM fields';
COMMENT ON COLUMN facebook_lead_forms.custom_field_mappings IS 'JSON structure for custom field mappings beyond standard CRM fields';
COMMENT ON COLUMN facebook_lead_forms.field_mappings_configured IS 'Boolean flag indicating if field mappings have been manually configured';
COMMENT ON COLUMN facebook_lead_forms.field_mappings_version IS 'Version of the field mapping schema for future migrations';
COMMENT ON FUNCTION validate_field_mappings IS 'Validates field mapping configuration and returns errors/warnings';
COMMENT ON FUNCTION apply_field_mappings IS 'Applies field mappings to raw Facebook lead data and returns transformed data';

-- Grant appropriate permissions
GRANT SELECT ON facebook_forms_with_mappings TO authenticated;
GRANT EXECUTE ON FUNCTION validate_field_mappings TO authenticated;
GRANT EXECUTE ON FUNCTION apply_field_mappings TO authenticated;