-- Customer Profiles System for Multi-Tenant SaaS Gym CRM
-- Comprehensive customer management with family members, emergency contacts, and profile photos

-- Customer profile photos table
CREATE TABLE IF NOT EXISTS customer_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency contacts table
CREATE TABLE IF NOT EXISTS customer_emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family members table
CREATE TABLE IF NOT EXISTS customer_family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- parent, child, spouse, sibling, etc.
  is_primary_guardian BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(primary_customer_id, family_member_id)
);

-- Customer notes table
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id),
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- general, medical, billing, behavior, achievement
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer medical information
CREATE TABLE IF NOT EXISTS customer_medical_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  allergies TEXT[],
  medical_conditions TEXT[],
  medications TEXT[],
  doctor_name TEXT,
  doctor_phone TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  blood_type TEXT,
  notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer preferences
CREATE TABLE IF NOT EXISTS customer_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  preferred_contact_method TEXT DEFAULT 'email', -- email, sms, whatsapp, phone
  preferred_language TEXT DEFAULT 'en',
  marketing_consent BOOLEAN DEFAULT true,
  photo_consent BOOLEAN DEFAULT true,
  reminder_preferences JSONB DEFAULT '{"sms": true, "email": true, "whatsapp": false}',
  notification_settings JSONB DEFAULT '{"bookings": true, "payments": true, "announcements": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer activity log
CREATE TABLE IF NOT EXISTS customer_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- check_in, booking, payment, note_added, profile_updated, etc.
  activity_data JSONB DEFAULT '{}',
  staff_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend leads table with additional profile fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'UK';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referral_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS joined_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_visit_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lifetime_value INTEGER DEFAULT 0; -- in pence
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes
CREATE INDEX idx_customer_photos_customer ON customer_photos(customer_id);
CREATE INDEX idx_customer_photos_org ON customer_photos(organization_id);
CREATE INDEX idx_emergency_contacts_customer ON customer_emergency_contacts(customer_id);
CREATE INDEX idx_family_members_primary ON customer_family_members(primary_customer_id);
CREATE INDEX idx_family_members_family ON customer_family_members(family_member_id);
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX idx_customer_notes_type ON customer_notes(note_type);
CREATE INDEX idx_medical_info_customer ON customer_medical_info(customer_id);
CREATE INDEX idx_preferences_customer ON customer_preferences(customer_id);
CREATE INDEX idx_activity_log_customer ON customer_activity_log(customer_id);
CREATE INDEX idx_activity_log_type ON customer_activity_log(activity_type);
CREATE INDEX idx_activity_log_created ON customer_activity_log(created_at DESC);
CREATE INDEX idx_leads_dob ON leads(date_of_birth);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

-- RLS Policies
ALTER TABLE customer_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_activity_log ENABLE ROW LEVEL SECURITY;

-- Customer photos policies
CREATE POLICY "Users can view photos in their organization" ON customer_photos
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage photos in their organization" ON customer_photos
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Emergency contacts policies
CREATE POLICY "Users can view emergency contacts in their organization" ON customer_emergency_contacts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage emergency contacts in their organization" ON customer_emergency_contacts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Family members policies
CREATE POLICY "Users can view family members in their organization" ON customer_family_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage family members in their organization" ON customer_family_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Customer notes policies
CREATE POLICY "Users can view notes in their organization" ON customer_notes
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    ) AND (NOT is_private OR staff_id = auth.uid())
  );

CREATE POLICY "Users can create notes in their organization" ON customer_notes
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notes" ON customer_notes
  FOR UPDATE USING (staff_id = auth.uid());

CREATE POLICY "Users can delete their own notes" ON customer_notes
  FOR DELETE USING (staff_id = auth.uid());

-- Medical info policies
CREATE POLICY "Users can view medical info in their organization" ON customer_medical_info
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage medical info in their organization" ON customer_medical_info
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Preferences policies
CREATE POLICY "Users can view preferences in their organization" ON customer_preferences
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage preferences in their organization" ON customer_preferences
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Activity log policies (read-only for users)
CREATE POLICY "Users can view activity in their organization" ON customer_activity_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity logs" ON customer_activity_log
  FOR INSERT WITH CHECK (true);

-- Helper functions
CREATE OR REPLACE FUNCTION log_customer_activity(
  p_customer_id UUID,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT '{}',
  p_staff_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  -- Get organization_id from customer
  SELECT organization_id INTO v_organization_id
  FROM leads
  WHERE id = p_customer_id;
  
  -- Log the activity
  INSERT INTO customer_activity_log (
    organization_id,
    customer_id,
    activity_type,
    activity_data,
    staff_id
  ) VALUES (
    v_organization_id,
    p_customer_id,
    p_activity_type,
    p_activity_data,
    COALESCE(p_staff_id, auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate customer age
CREATE OR REPLACE FUNCTION get_customer_age(p_customer_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_dob DATE;
BEGIN
  SELECT date_of_birth INTO v_dob
  FROM leads
  WHERE id = p_customer_id;
  
  IF v_dob IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN DATE_PART('year', AGE(v_dob));
END;
$$ LANGUAGE plpgsql;

-- Function to get primary emergency contact
CREATE OR REPLACE FUNCTION get_primary_emergency_contact(p_customer_id UUID)
RETURNS TABLE (
  name TEXT,
  relationship TEXT,
  phone TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.name,
    ec.relationship,
    ec.phone,
    ec.email
  FROM customer_emergency_contacts ec
  WHERE ec.customer_id = p_customer_id
    AND ec.is_primary = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_visit_date
CREATE OR REPLACE FUNCTION update_last_visit_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type = 'check_in' THEN
    UPDATE leads
    SET 
      last_visit_date = CURRENT_DATE,
      total_visits = COALESCE(total_visits, 0) + 1
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_last_visit
  AFTER INSERT ON customer_activity_log
  FOR EACH ROW
  WHEN (NEW.activity_type = 'check_in')
  EXECUTE FUNCTION update_last_visit_date();