-- =============================================
-- ENHANCED BOOKING LINKS SYSTEM WITH GHL-LIKE FUNCTIONALITY
-- Migration: 20250819_enhanced_booking_links
-- Extends existing booking system with comprehensive GHL features
-- =============================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. ENHANCED BOOKING LINKS TABLE
-- =============================================

-- Add new columns to existing booking_links table
DO $$
BEGIN
  -- Meeting title template
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'meeting_title_template') THEN
    ALTER TABLE booking_links ADD COLUMN meeting_title_template TEXT DEFAULT '{{contact.name}} - {{service}}';
  END IF;
  
  -- Staff assignment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'assigned_staff_ids') THEN
    ALTER TABLE booking_links ADD COLUMN assigned_staff_ids UUID[];
  END IF;
  
  -- Meeting location details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'meeting_location') THEN
    ALTER TABLE booking_links ADD COLUMN meeting_location JSONB DEFAULT '{"type": "in_person", "details": ""}';
  END IF;
  
  -- Availability rules
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'availability_rules') THEN
    ALTER TABLE booking_links ADD COLUMN availability_rules JSONB DEFAULT '{}';
  END IF;
  
  -- Form configuration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'form_configuration') THEN
    ALTER TABLE booking_links ADD COLUMN form_configuration JSONB DEFAULT '{"fields": [], "consent_text": "I agree to receive communications about my booking."}';
  END IF;
  
  -- Confirmation settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'confirmation_settings') THEN
    ALTER TABLE booking_links ADD COLUMN confirmation_settings JSONB DEFAULT '{"auto_confirm": true, "redirect_url": "", "custom_message": ""}';
  END IF;
  
  -- Notification settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'notification_settings') THEN
    ALTER TABLE booking_links ADD COLUMN notification_settings JSONB DEFAULT '{"email_enabled": true, "sms_enabled": false, "reminder_schedules": ["1 day", "1 hour"]}';
  END IF;
  
  -- Style settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'style_settings') THEN
    ALTER TABLE booking_links ADD COLUMN style_settings JSONB DEFAULT '{"primary_color": "#3b82f6", "background_color": "#ffffff", "custom_css": ""}';
  END IF;
  
  -- Payment settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'payment_settings') THEN
    ALTER TABLE booking_links ADD COLUMN payment_settings JSONB DEFAULT '{"enabled": false, "amount": 0, "currency": "GBP", "description": ""}';
  END IF;
  
  -- Cancellation policy
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'cancellation_policy') THEN
    ALTER TABLE booking_links ADD COLUMN cancellation_policy JSONB DEFAULT '{"allowed": true, "hours_before": 24, "policy_text": "Cancellations allowed up to 24 hours before appointment."}';
  END IF;
  
  -- Booking limits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'booking_limits') THEN
    ALTER TABLE booking_links ADD COLUMN booking_limits JSONB DEFAULT '{"max_per_day": null, "max_per_week": null, "max_per_month": null}';
  END IF;
  
  -- Buffer settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'buffer_settings') THEN
    ALTER TABLE booking_links ADD COLUMN buffer_settings JSONB DEFAULT '{"before_minutes": 0, "after_minutes": 15}';
  END IF;
END $$;

-- =============================================
-- 2. BOOKING AVAILABILITY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS booking_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  timezone VARCHAR(100) DEFAULT 'Europe/London',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_link_id, staff_id, day_of_week, start_time, end_time)
);

-- =============================================
-- 3. BOOKING EXCEPTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS booking_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means applies to all staff
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL, -- true=available, false=unavailable
  custom_hours JSONB, -- For custom time slots on specific dates
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. BOOKING FORM FIELDS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS booking_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio', 'date', 'time')),
  field_options JSONB, -- For select/radio options
  is_required BOOLEAN DEFAULT false,
  placeholder TEXT,
  validation_rules JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. BOOKING LINK ANALYTICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS booking_link_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('page_view', 'form_started', 'booking_completed', 'booking_cancelled')),
  visitor_id VARCHAR(255), -- Anonymous visitor tracking
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. GYM-SPECIFIC ENHANCEMENTS
-- =============================================

-- Equipment requirements table
CREATE TABLE IF NOT EXISTS booking_equipment_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_name VARCHAR(100) NOT NULL,
  equipment_type VARCHAR(50) CHECK (equipment_type IN ('cardio', 'strength', 'functional', 'studio', 'pool', 'court')),
  is_required BOOLEAN DEFAULT true,
  alternative_options TEXT[], -- Alternative equipment that can be used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trainer specializations table
CREATE TABLE IF NOT EXISTS trainer_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  specialization_type VARCHAR(50) NOT NULL CHECK (specialization_type IN ('personal_training', 'group_fitness', 'nutrition', 'physiotherapy', 'sports_massage', 'yoga', 'pilates', 'crossfit', 'powerlifting', 'bodybuilding')),
  certification_name VARCHAR(100),
  certification_body VARCHAR(100),
  certification_date DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session capacity settings (extends appointment_types)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointment_types' AND column_name = 'max_capacity') THEN
    ALTER TABLE appointment_types ADD COLUMN max_capacity INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointment_types' AND column_name = 'min_capacity') THEN
    ALTER TABLE appointment_types ADD COLUMN min_capacity INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointment_types' AND column_name = 'equipment_requirements') THEN
    ALTER TABLE appointment_types ADD COLUMN equipment_requirements JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointment_types' AND column_name = 'fitness_level') THEN
    ALTER TABLE appointment_types ADD COLUMN fitness_level VARCHAR(50) CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'any'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointment_types' AND column_name = 'session_type') THEN
    ALTER TABLE appointment_types ADD COLUMN session_type VARCHAR(50) DEFAULT 'consultation' CHECK (session_type IN ('consultation', 'personal_training', 'group_class', 'assessment', 'follow_up', 'nutrition_consult'));
  END IF;
END $$;

-- =============================================
-- 7. INDEXES FOR PERFORMANCE
-- =============================================

-- Booking availability indexes
CREATE INDEX IF NOT EXISTS idx_booking_availability_link_staff ON booking_availability(booking_link_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_booking_availability_day ON booking_availability(day_of_week, start_time) WHERE is_available = true;

-- Booking exceptions indexes
CREATE INDEX IF NOT EXISTS idx_booking_exceptions_link_date ON booking_exceptions(booking_link_id, exception_date);
CREATE INDEX IF NOT EXISTS idx_booking_exceptions_staff_date ON booking_exceptions(staff_id, exception_date) WHERE staff_id IS NOT NULL;

-- Form fields indexes
CREATE INDEX IF NOT EXISTS idx_booking_form_fields_link_order ON booking_form_fields(booking_link_id, display_order) WHERE is_active = true;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_booking_analytics_link_created ON booking_link_analytics(booking_link_id, created_at);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_event_type ON booking_link_analytics(event_type, created_at);

-- Equipment requirements indexes
CREATE INDEX IF NOT EXISTS idx_booking_equipment_link ON booking_equipment_requirements(booking_link_id);

-- Trainer specializations indexes
CREATE INDEX IF NOT EXISTS idx_trainer_specializations_staff ON trainer_specializations(staff_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trainer_specializations_type ON trainer_specializations(specialization_type) WHERE is_active = true;

-- Enhanced appointment types indexes
CREATE INDEX IF NOT EXISTS idx_appointment_types_session_type ON appointment_types(session_type, is_active);
CREATE INDEX IF NOT EXISTS idx_appointment_types_capacity ON appointment_types(max_capacity) WHERE max_capacity > 1;

-- =============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on new tables
ALTER TABLE booking_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_link_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_equipment_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_specializations ENABLE ROW LEVEL SECURITY;

-- Booking availability policies
CREATE POLICY "Users can view booking availability for their org" ON booking_availability
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage booking availability for their links" ON booking_availability
  FOR ALL USING (
    booking_link_id IN (
      SELECT id FROM booking_links 
      WHERE user_id = auth.uid() OR organization_id IN (
        SELECT om.org_id FROM organization_members om 
        WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
      )
    )
  );

-- Booking exceptions policies
CREATE POLICY "Users can view booking exceptions for their org" ON booking_exceptions
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage booking exceptions for their links" ON booking_exceptions
  FOR ALL USING (
    booking_link_id IN (
      SELECT id FROM booking_links 
      WHERE user_id = auth.uid() OR organization_id IN (
        SELECT om.org_id FROM organization_members om 
        WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
      )
    )
  );

-- Form fields policies
CREATE POLICY "Anyone can view form fields for public booking links" ON booking_form_fields
  FOR SELECT USING (
    booking_link_id IN (
      SELECT id FROM booking_links WHERE is_active = true AND is_public = true
    )
  );

CREATE POLICY "Users can manage form fields for their links" ON booking_form_fields
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Analytics policies
CREATE POLICY "System can track booking link analytics" ON booking_link_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view analytics for their org" ON booking_link_analytics
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Equipment requirements policies
CREATE POLICY "Anyone can view equipment requirements for public links" ON booking_equipment_requirements
  FOR SELECT USING (
    booking_link_id IN (
      SELECT id FROM booking_links WHERE is_active = true AND is_public = true
    )
  );

CREATE POLICY "Users can manage equipment requirements for their org" ON booking_equipment_requirements
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Trainer specializations policies
CREATE POLICY "Users can view trainer specializations for their org" ON trainer_specializations
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own specializations" ON trainer_specializations
  FOR ALL USING (
    staff_id = auth.uid() OR organization_id IN (
      SELECT om.org_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

-- =============================================
-- 9. FUNCTIONS AND TRIGGERS
-- =============================================

-- Add updated_at triggers to new tables
CREATE TRIGGER update_booking_availability_updated_at 
  BEFORE UPDATE ON booking_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_exceptions_updated_at 
  BEFORE UPDATE ON booking_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_form_fields_updated_at 
  BEFORE UPDATE ON booking_form_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_specializations_updated_at 
  BEFORE UPDATE ON trainer_specializations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate booking link configuration
CREATE OR REPLACE FUNCTION validate_booking_link_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure at least one appointment type is selected
  IF array_length(NEW.appointment_type_ids, 1) IS NULL OR array_length(NEW.appointment_type_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one appointment type must be selected';
  END IF;
  
  -- Ensure assigned staff exists if specified
  IF NEW.assigned_staff_ids IS NOT NULL AND array_length(NEW.assigned_staff_ids, 1) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users u
      JOIN organization_members om ON u.id = om.user_id
      WHERE u.id = ANY(NEW.assigned_staff_ids)
        AND om.org_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'All assigned staff must be members of the organization';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for booking link validation
CREATE TRIGGER validate_booking_link_config_trigger
  BEFORE INSERT OR UPDATE ON booking_links
  FOR EACH ROW EXECUTE FUNCTION validate_booking_link_config();

-- Function to generate slug if not provided
CREATE OR REPLACE FUNCTION generate_slug_if_empty()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug = trim(NEW.slug, '-');
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM booking_links WHERE slug = NEW.slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      NEW.slug = NEW.slug || '-' || substr(md5(random()::text), 1, 4);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for slug generation
CREATE TRIGGER generate_slug_if_empty_trigger
  BEFORE INSERT OR UPDATE ON booking_links
  FOR EACH ROW EXECUTE FUNCTION generate_slug_if_empty();

-- Function to calculate available slots for a booking link
CREATE OR REPLACE FUNCTION get_booking_link_availability(
  p_booking_link_slug TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_timezone TEXT DEFAULT 'Europe/London'
)
RETURNS TABLE (
  date_slot DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  staff_id UUID,
  staff_name TEXT,
  appointment_type_id UUID,
  appointment_type_name TEXT
) AS $$
BEGIN
  -- This function will be implemented to return available booking slots
  -- combining availability rules, exceptions, existing bookings, and staff schedules
  RETURN QUERY
  SELECT 
    p_start_date as date_slot,
    NOW() as start_time,
    NOW() + INTERVAL '1 hour' as end_time,
    NULL::UUID as staff_id,
    ''::TEXT as staff_name,
    NULL::UUID as appointment_type_id,
    ''::TEXT as appointment_type_name
  LIMIT 0; -- Placeholder - actual implementation will be in API layer
END;
$$ language 'plpgsql';

-- =============================================
-- 10. DEFAULT DATA AND CONFIGURATIONS
-- =============================================

-- Insert default form fields for existing booking links
INSERT INTO booking_form_fields (booking_link_id, organization_id, field_name, field_label, field_type, is_required, display_order)
SELECT 
  bl.id,
  bl.organization_id,
  'name',
  'Full Name',
  'text',
  true,
  1
FROM booking_links bl
WHERE NOT EXISTS (
  SELECT 1 FROM booking_form_fields 
  WHERE booking_link_id = bl.id AND field_name = 'name'
);

INSERT INTO booking_form_fields (booking_link_id, organization_id, field_name, field_label, field_type, is_required, display_order)
SELECT 
  bl.id,
  bl.organization_id,
  'email',
  'Email Address',
  'email',
  true,
  2
FROM booking_links bl
WHERE NOT EXISTS (
  SELECT 1 FROM booking_form_fields 
  WHERE booking_link_id = bl.id AND field_name = 'email'
);

INSERT INTO booking_form_fields (booking_link_id, organization_id, field_name, field_label, field_type, is_required, display_order)
SELECT 
  bl.id,
  bl.organization_id,
  'phone',
  'Phone Number',
  'phone',
  false,
  3
FROM booking_links bl
WHERE NOT EXISTS (
  SELECT 1 FROM booking_form_fields 
  WHERE booking_link_id = bl.id AND field_name = 'phone'
);

-- Add gym-specific appointment types for existing organizations
INSERT INTO appointment_types (organization_id, name, description, duration_minutes, session_type, max_capacity, fitness_level)
SELECT 
  id,
  'Personal Training Session',
  'One-on-one personal training session',
  60,
  'personal_training',
  1,
  'any'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM appointment_types 
  WHERE organization_id = organizations.id AND session_type = 'personal_training'
);

INSERT INTO appointment_types (organization_id, name, description, duration_minutes, session_type, max_capacity, fitness_level)
SELECT 
  id,
  'Fitness Assessment',
  'Initial fitness assessment and goal setting',
  90,
  'assessment',
  1,
  'any'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM appointment_types 
  WHERE organization_id = organizations.id AND session_type = 'assessment'
);

INSERT INTO appointment_types (organization_id, name, description, duration_minutes, session_type, max_capacity, fitness_level)
SELECT 
  id,
  'Group Fitness Class',
  'Group fitness class session',
  45,
  'group_class',
  15,
  'any'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM appointment_types 
  WHERE organization_id = organizations.id AND session_type = 'group_class'
);

-- Table comments for documentation
COMMENT ON TABLE booking_availability IS 'Staff availability rules for specific booking links';
COMMENT ON TABLE booking_exceptions IS 'Date-specific availability exceptions for booking links';
COMMENT ON TABLE booking_form_fields IS 'Custom form fields for booking link forms';
COMMENT ON TABLE booking_link_analytics IS 'Analytics and tracking data for booking links';
COMMENT ON TABLE booking_equipment_requirements IS 'Equipment requirements for gym bookings';
COMMENT ON TABLE trainer_specializations IS 'Trainer certifications and specializations';

-- Column comments
COMMENT ON COLUMN booking_links.meeting_title_template IS 'Template for meeting titles with variables like {{contact.name}}';
COMMENT ON COLUMN booking_links.assigned_staff_ids IS 'Array of staff member IDs who can take bookings through this link';
COMMENT ON COLUMN booking_links.meeting_location IS 'JSON object defining meeting location (type, details, zoom link, etc.)';
COMMENT ON COLUMN booking_links.availability_rules IS 'JSON object defining availability rules and constraints';
COMMENT ON COLUMN booking_links.form_configuration IS 'JSON object defining custom form fields and validation';
COMMENT ON COLUMN booking_links.confirmation_settings IS 'JSON object for booking confirmation behavior';
COMMENT ON COLUMN booking_links.notification_settings IS 'JSON object for email/SMS notification configuration';
COMMENT ON COLUMN booking_links.style_settings IS 'JSON object for booking page visual customization';
COMMENT ON COLUMN booking_links.payment_settings IS 'JSON object for optional payment collection';
COMMENT ON COLUMN booking_links.cancellation_policy IS 'JSON object defining cancellation rules and policy';