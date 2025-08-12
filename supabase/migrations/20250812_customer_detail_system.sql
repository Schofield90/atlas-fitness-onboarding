-- Migration: Add customer detail system tables
-- Description: Creates tables for emergency contacts, documents, waivers, medical info, and family members
-- to support comprehensive customer management

-- First, ensure clients table has the required structure
ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_visit TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0.00;

-- Update existing name column to be populated from first_name and last_name
UPDATE clients 
SET first_name = COALESCE(first_name, split_part(name, ' ', 1)),
    last_name = COALESCE(last_name, CASE WHEN array_length(string_to_array(name, ' '), 1) > 1 
                                        THEN substring(name from length(split_part(name, ' ', 1)) + 2)
                                        ELSE '' END)
WHERE first_name IS NULL OR last_name IS NULL;

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Contact details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  
  -- Address
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  
  -- Priority
  is_primary BOOLEAN DEFAULT false,
  priority_order INTEGER DEFAULT 1,
  
  -- Additional info
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customer_documents table
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Document details
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'waiver', 'medical_form', 'membership_agreement', 'photo_id', 'other'
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  original_filename TEXT,
  
  -- Status and metadata
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'expired'
  expiry_date DATE,
  tags JSONB DEFAULT '[]',
  description TEXT,
  
  -- Upload info
  uploaded_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customer_waivers table
CREATE TABLE IF NOT EXISTS customer_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Waiver details
  waiver_name TEXT NOT NULL,
  waiver_type TEXT NOT NULL, -- 'liability', 'medical', 'photo_release', 'general'
  waiver_template_id UUID, -- Reference to waiver template if exists
  
  -- Signature info
  signature_data TEXT, -- Base64 encoded signature
  signature_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  -- Status
  status TEXT DEFAULT 'signed', -- 'signed', 'expired', 'revoked'
  expiry_date DATE,
  
  -- Waiver content (snapshot at time of signing)
  waiver_content TEXT NOT NULL,
  waiver_version TEXT,
  
  -- Witness information
  witness_name TEXT,
  witness_signature TEXT,
  witness_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customer_medical_info table
CREATE TABLE IF NOT EXISTS customer_medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Medical history
  medical_conditions JSONB DEFAULT '[]', -- Array of medical conditions
  medications JSONB DEFAULT '[]', -- Array of medications
  allergies JSONB DEFAULT '[]', -- Array of allergies
  injuries JSONB DEFAULT '[]', -- Array of past injuries
  
  -- Emergency medical info
  emergency_medical_info TEXT,
  doctor_name TEXT,
  doctor_phone TEXT,
  
  -- Physical info
  height_inches INTEGER,
  weight_lbs DECIMAL(5,2),
  blood_type TEXT,
  
  -- Activity restrictions
  activity_restrictions TEXT,
  fitness_limitations TEXT,
  
  -- Insurance info
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  
  -- Consent and privacy
  medical_info_consent BOOLEAN DEFAULT false,
  share_with_trainers BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one medical record per client
  UNIQUE(client_id)
);

-- Create customer_family_members table
CREATE TABLE IF NOT EXISTS customer_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  family_member_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Relationship info
  relationship_type TEXT NOT NULL, -- 'spouse', 'child', 'parent', 'sibling', 'other'
  relationship_description TEXT,
  
  -- If family member is not a client yet
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  
  -- Family account settings
  is_authorized_pickup BOOLEAN DEFAULT false,
  can_modify_bookings BOOLEAN DEFAULT false,
  can_view_billing BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'inactive'
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we have either a client_id or personal info
  CONSTRAINT family_member_info_check CHECK (
    family_member_client_id IS NOT NULL OR 
    (first_name IS NOT NULL AND last_name IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_client_id ON emergency_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_organization_id ON emergency_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_primary ON emergency_contacts(is_primary, priority_order);

CREATE INDEX IF NOT EXISTS idx_customer_documents_client_id ON customer_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_organization_id ON customer_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_type ON customer_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_customer_documents_status ON customer_documents(status);

CREATE INDEX IF NOT EXISTS idx_customer_waivers_client_id ON customer_waivers(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_organization_id ON customer_waivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_type ON customer_waivers(waiver_type);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_status ON customer_waivers(status);

CREATE INDEX IF NOT EXISTS idx_customer_medical_info_client_id ON customer_medical_info(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_medical_info_organization_id ON customer_medical_info(organization_id);

CREATE INDEX IF NOT EXISTS idx_customer_family_primary_client ON customer_family_members(primary_client_id);
CREATE INDEX IF NOT EXISTS idx_customer_family_member_client ON customer_family_members(family_member_client_id);
CREATE INDEX IF NOT EXISTS idx_customer_family_organization_id ON customer_family_members(organization_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_emergency_contacts_updated_at 
  BEFORE UPDATE ON emergency_contacts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_documents_updated_at 
  BEFORE UPDATE ON customer_documents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_waivers_updated_at 
  BEFORE UPDATE ON customer_waivers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_medical_info_updated_at 
  BEFORE UPDATE ON customer_medical_info 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_family_members_updated_at 
  BEFORE UPDATE ON customer_family_members 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_family_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for emergency_contacts
CREATE POLICY "Users can view emergency contacts in their organization" ON emergency_contacts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage emergency contacts in their organization" ON emergency_contacts
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to emergency contacts" ON emergency_contacts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create RLS policies for customer_documents
CREATE POLICY "Users can view customer documents in their organization" ON customer_documents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage customer documents in their organization" ON customer_documents
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to customer documents" ON customer_documents
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create RLS policies for customer_waivers
CREATE POLICY "Users can view customer waivers in their organization" ON customer_waivers
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage customer waivers in their organization" ON customer_waivers
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to customer waivers" ON customer_waivers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create RLS policies for customer_medical_info
CREATE POLICY "Users can view customer medical info in their organization" ON customer_medical_info
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage customer medical info in their organization" ON customer_medical_info
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to customer medical info" ON customer_medical_info
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create RLS policies for customer_family_members
CREATE POLICY "Users can view customer family members in their organization" ON customer_family_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage customer family members in their organization" ON customer_family_members
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to customer family members" ON customer_family_members
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE emergency_contacts IS 'Emergency contact information for gym clients';
COMMENT ON TABLE customer_documents IS 'Document storage and management for customer files';
COMMENT ON TABLE customer_waivers IS 'Digital waiver signatures and liability documents';
COMMENT ON TABLE customer_medical_info IS 'Medical information and health data for clients';
COMMENT ON TABLE customer_family_members IS 'Family member relationships and authorized contacts';