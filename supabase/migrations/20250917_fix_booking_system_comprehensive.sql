-- =============================================
-- FIX BOOKING SYSTEM COMPREHENSIVE
-- Migration: 20250917_fix_booking_system_comprehensive
-- Fixes: Customer/Client booking conflicts, RLS policies, and table inconsistencies
-- =============================================

-- =============================================
-- 1. STANDARDIZE ORGANIZATION MEMBER TABLES
-- =============================================

-- Ensure we have a consistent user_organizations table structure
DO $$
BEGIN
  -- Check if user_organizations table exists and has the right structure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_organizations'
  ) THEN
    -- Create user_organizations table if it doesn't exist
    CREATE TABLE user_organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      role VARCHAR NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'staff')),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, organization_id)
    );
    
    -- Enable RLS
    ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
    
    -- Create basic RLS policies
    CREATE POLICY "Users can view their own organization memberships" ON user_organizations
      FOR SELECT USING (user_id = auth.uid());
      
    CREATE POLICY "Users can manage their own organization memberships" ON user_organizations
      FOR ALL USING (user_id = auth.uid());
  END IF;
  
  -- Ensure organization_id column exists (some older versions might have org_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_organizations' AND column_name = 'organization_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_organizations' AND column_name = 'org_id'
  ) THEN
    -- Rename org_id to organization_id for consistency
    ALTER TABLE user_organizations RENAME COLUMN org_id TO organization_id;
  END IF;
END $$;

-- =============================================
-- 2. FIX BOOKINGS TABLE STRUCTURE
-- =============================================

DO $$
BEGIN
  -- Ensure bookings table has organization_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  -- Add client_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
  
  -- Make customer_id nullable since we can use client_id instead
  ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;
  
  -- Add constraint to ensure exactly one of customer_id or client_id is set
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_customer_or_client_booking;
  ALTER TABLE bookings 
  ADD CONSTRAINT check_customer_or_client_booking 
  CHECK (
    (customer_id IS NOT NULL AND client_id IS NULL) OR 
    (customer_id IS NULL AND client_id IS NOT NULL)
  );
  
  -- Add indexes for performance
  CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
END $$;

-- =============================================
-- 3. ENSURE PROPER COLUMN NAMES IN CLIENTS TABLE  
-- =============================================

DO $$
BEGIN
  -- Some migrations use org_id, others use organization_id
  -- Ensure clients table uses organization_id consistently
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'org_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE clients RENAME COLUMN org_id TO organization_id;
  END IF;
  
  -- Add organization_id if it doesn't exist at all
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  -- Add missing columns that might be needed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'status'
  ) THEN
    ALTER TABLE clients ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
  
  -- Add indexes
  CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
  CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
END $$;

-- =============================================
-- 4. FIX LEADS TABLE ORGANIZATION REFERENCE
-- =============================================

DO $$
BEGIN
  -- Ensure leads table uses organization_id consistently
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'org_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE leads RENAME COLUMN org_id TO organization_id;
  END IF;
  
  -- Add organization_id if it doesn't exist at all
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  -- Add client_id reference if it doesn't exist (for reverse lookup)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================
-- 5. UPDATE RLS POLICIES FOR BOOKINGS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view bookings from their organization" ON bookings;
DROP POLICY IF EXISTS "Users can manage bookings in their organization" ON bookings;
DROP POLICY IF EXISTS "Users can view org bookings" ON bookings;
DROP POLICY IF EXISTS "Users can manage org bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can create public bookings" ON bookings;

-- Create comprehensive RLS policies for bookings
CREATE POLICY "Users can view bookings from their organization" ON bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create bookings for their organization" ON bookings
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update bookings in their organization" ON bookings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete bookings in their organization" ON bookings
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Special policy for public booking creation (for booking widgets)
CREATE POLICY "Public can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- =============================================
-- 6. UPDATE RLS POLICIES FOR CLIENTS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view clients from their organization" ON clients;
DROP POLICY IF EXISTS "Users can manage clients in their organization" ON clients;

-- Create comprehensive RLS policies for clients
CREATE POLICY "Users can view clients from their organization" ON clients
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create clients for their organization" ON clients
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update clients in their organization" ON clients
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

-- =============================================
-- 7. UPDATE RLS POLICIES FOR LEADS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view leads from their organization" ON leads;
DROP POLICY IF EXISTS "Users can manage leads in their organization" ON leads;

-- Create comprehensive RLS policies for leads
CREATE POLICY "Users can view leads from their organization" ON leads
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create leads for their organization" ON leads
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update leads in their organization" ON leads
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

-- =============================================
-- 8. HELPER FUNCTIONS FOR BOOKING
-- =============================================

-- Function to create a lead entry from a client for backward compatibility
CREATE OR REPLACE FUNCTION create_lead_from_client(
  p_client_id UUID,
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_client_data RECORD;
  v_lead_id UUID;
BEGIN
  -- Get client data
  SELECT * INTO v_client_data
  FROM clients 
  WHERE id = p_client_id AND organization_id = p_organization_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found or access denied';
  END IF;
  
  -- Check if lead already exists for this client
  SELECT id INTO v_lead_id
  FROM leads
  WHERE client_id = p_client_id AND organization_id = p_organization_id;
  
  IF FOUND THEN
    RETURN v_lead_id;
  END IF;
  
  -- Create new lead entry
  INSERT INTO leads (
    organization_id,
    first_name,
    last_name,
    email,
    phone,
    status,
    source,
    client_id
  ) VALUES (
    p_organization_id,
    v_client_data.first_name,
    v_client_data.last_name,
    v_client_data.email,
    v_client_data.phone,
    'customer',
    'client_sync',
    p_client_id
  )
  RETURNING id INTO v_lead_id;
  
  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. ENSURE PROPER INDEXES FOR PERFORMANCE
-- =============================================

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_org_session ON bookings(organization_id, class_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_org_status ON bookings(organization_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_clients_org_status ON clients(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);

-- Create indexes for foreign key relationships
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_lead_id ON clients(lead_id) WHERE lead_id IS NOT NULL;

-- =============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE bookings IS 'Class bookings supporting both leads (customer_id) and clients (client_id)';
COMMENT ON COLUMN bookings.customer_id IS 'Reference to leads table (legacy/converted customers)';
COMMENT ON COLUMN bookings.client_id IS 'Reference to clients table (direct client entries)';
COMMENT ON CONSTRAINT check_customer_or_client_booking ON bookings IS 'Ensures exactly one of customer_id or client_id is set';

COMMENT ON FUNCTION create_lead_from_client(UUID, UUID) IS 'Creates a lead entry from client data for backward compatibility with booking system';