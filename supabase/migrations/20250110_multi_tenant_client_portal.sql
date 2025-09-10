-- =============================================
-- MULTI-TENANT CLIENT PORTAL SUPPORT
-- Migration: 20250110_multi_tenant_client_portal
-- Purpose: Ensure client portal works for ALL clients across ALL gyms
-- =============================================

-- =============================================
-- 1. ADD client_id SUPPORT TO TABLES
-- =============================================

-- Add client_id to memberships table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE memberships ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add client_id to class_credits table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_credits' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE class_credits ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update constraints to allow EITHER customer_id OR client_id
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS check_customer_or_client_membership;
ALTER TABLE memberships 
ADD CONSTRAINT check_customer_or_client_membership 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL) OR
  (customer_id IS NOT NULL AND client_id IS NOT NULL) -- Allow both during migration
);

ALTER TABLE class_credits DROP CONSTRAINT IF EXISTS check_customer_or_client_credits;
ALTER TABLE class_credits 
ADD CONSTRAINT check_customer_or_client_credits 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL) OR
  (customer_id IS NOT NULL AND client_id IS NOT NULL) -- Allow both during migration
);

-- =============================================
-- 2. CREATE MIGRATION FUNCTION
-- =============================================

-- Function to migrate existing lead-based data to direct client relationships
CREATE OR REPLACE FUNCTION migrate_lead_to_client_data(
  p_organization_id UUID
)
RETURNS TABLE(
  migrated_bookings INT,
  migrated_memberships INT,
  migrated_credits INT
) AS $$
DECLARE
  v_booking_count INT := 0;
  v_membership_count INT := 0;
  v_credit_count INT := 0;
BEGIN
  -- Migrate bookings from customer_id to client_id
  UPDATE bookings b
  SET client_id = l.client_id
  FROM leads l
  WHERE b.customer_id = l.id 
  AND l.client_id IS NOT NULL
  AND b.client_id IS NULL
  AND b.organization_id = p_organization_id;
  
  GET DIAGNOSTICS v_booking_count = ROW_COUNT;
  
  -- Migrate memberships
  UPDATE memberships m
  SET client_id = l.client_id
  FROM leads l
  WHERE m.customer_id = l.id 
  AND l.client_id IS NOT NULL
  AND m.client_id IS NULL
  AND m.organization_id = p_organization_id;
  
  GET DIAGNOSTICS v_membership_count = ROW_COUNT;
  
  -- Migrate class credits
  UPDATE class_credits cc
  SET client_id = l.client_id
  FROM leads l
  WHERE cc.customer_id = l.id 
  AND l.client_id IS NOT NULL
  AND cc.client_id IS NULL
  AND cc.organization_id = p_organization_id;
  
  GET DIAGNOSTICS v_credit_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_booking_count, v_membership_count, v_credit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_org ON bookings(client_id, organization_id);

-- Memberships indexes
CREATE INDEX IF NOT EXISTS idx_memberships_client_id ON memberships(client_id);
CREATE INDEX IF NOT EXISTS idx_memberships_client_org ON memberships(client_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_client_status ON memberships(client_id, membership_status);

-- Class credits indexes
CREATE INDEX IF NOT EXISTS idx_class_credits_client_id ON class_credits(client_id);
CREATE INDEX IF NOT EXISTS idx_class_credits_client_org ON class_credits(client_id, organization_id);

-- =============================================
-- 4. UPDATE RLS POLICIES FOR DIRECT CLIENT ACCESS
-- =============================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Clients can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can create their own bookings" ON bookings;

-- Create new policies for clients to access their own data
CREATE POLICY "Clients can view their own bookings" ON bookings
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create their own bookings" ON bookings
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- Memberships policies
DROP POLICY IF EXISTS "Clients can view their own memberships" ON memberships;
CREATE POLICY "Clients can view their own memberships" ON memberships
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- Class credits policies
DROP POLICY IF EXISTS "Clients can view their own credits" ON class_credits;
CREATE POLICY "Clients can view their own credits" ON class_credits
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 5. HELPER FUNCTION FOR NEW CLIENT SETUP
-- =============================================

-- Function to set up a new client with all necessary data
CREATE OR REPLACE FUNCTION setup_new_client(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_client_id UUID;
  v_lead_id UUID;
BEGIN
  -- Create client record
  INSERT INTO clients (
    email,
    first_name,
    last_name,
    phone,
    organization_id,
    user_id,
    status,
    created_at
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name,
    p_phone,
    p_organization_id,
    p_user_id,
    'active',
    NOW()
  )
  RETURNING id INTO v_client_id;
  
  -- Check if a lead exists for this email in the same organization
  SELECT id INTO v_lead_id
  FROM leads
  WHERE email = p_email 
  AND organization_id = p_organization_id
  LIMIT 1;
  
  -- If lead exists, link it to the client
  IF v_lead_id IS NOT NULL THEN
    UPDATE leads 
    SET client_id = v_client_id
    WHERE id = v_lead_id;
    
    -- Migrate existing data to use client_id
    UPDATE bookings 
    SET client_id = v_client_id
    WHERE customer_id = v_lead_id AND client_id IS NULL;
    
    UPDATE memberships 
    SET client_id = v_client_id
    WHERE customer_id = v_lead_id AND client_id IS NULL;
    
    UPDATE class_credits 
    SET client_id = v_client_id
    WHERE customer_id = v_lead_id AND client_id IS NULL;
  END IF;
  
  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION migrate_lead_to_client_data(UUID) IS 
'Migrates lead-based data to direct client relationships for better multi-tenant support';

COMMENT ON FUNCTION setup_new_client(TEXT, TEXT, TEXT, TEXT, UUID, UUID) IS 
'Sets up a new client and automatically links/migrates any existing lead data';

COMMENT ON COLUMN bookings.client_id IS 
'Direct reference to client for multi-tenant support (preferred over customer_id)';

COMMENT ON COLUMN memberships.client_id IS 
'Direct reference to client for multi-tenant support (preferred over customer_id)';

COMMENT ON COLUMN class_credits.client_id IS 
'Direct reference to client for multi-tenant support (preferred over customer_id)';