-- =============================================
-- FIX CLIENT PORTAL RLS POLICIES
-- Migration: 20250110_fix_client_portal_rls
-- Purpose: Fix 406 errors by adding proper RLS policies for client portal
-- =============================================

-- Enable RLS on all necessary tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 1. ORGANIZATIONS ACCESS
-- =============================================

-- Clients can view their organization
CREATE POLICY "Clients can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 2. ORGANIZATION STAFF ACCESS
-- =============================================

-- Clients can view staff in their organization
CREATE POLICY "Clients can view organization staff" ON organization_staff
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 3. BOOKINGS ACCESS
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can create their own bookings" ON bookings;

-- Clients can view their bookings (both direct and via leads)
CREATE POLICY "Clients can view their bookings" ON bookings
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT l.id FROM leads l
      JOIN clients c ON l.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT id FROM leads
      WHERE email IN (
        SELECT email FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- Clients can create bookings
CREATE POLICY "Clients can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 4. CLASS SESSIONS ACCESS
-- =============================================

-- Clients can view class sessions in their organization
CREATE POLICY "Clients can view class sessions" ON class_sessions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 5. CLASS CREDITS ACCESS
-- =============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Clients can view their own credits" ON class_credits;

-- Clients can view their credits (both direct and via leads)
CREATE POLICY "Clients can view their credits" ON class_credits
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT l.id FROM leads l
      JOIN clients c ON l.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT id FROM leads
      WHERE email IN (
        SELECT email FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- 6. LEADS ACCESS
-- =============================================

-- Clients can view their associated lead records
CREATE POLICY "Clients can view their lead records" ON leads
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
    OR
    email IN (
      SELECT email FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 7. PROGRAMS ACCESS
-- =============================================

-- Clients can view programs in their organization
CREATE POLICY "Clients can view programs" ON programs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 8. ORGANIZATION LOCATIONS ACCESS
-- =============================================

-- Clients can view locations in their organization
CREATE POLICY "Clients can view organization locations" ON organization_locations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 9. CUSTOMER MEMBERSHIPS ACCESS
-- =============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Clients can view their own memberships" ON customer_memberships;

-- Clients can view their memberships (both direct and via leads)
CREATE POLICY "Clients can view their memberships" ON customer_memberships
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT l.id FROM leads l
      JOIN clients c ON l.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT id FROM leads
      WHERE email IN (
        SELECT email FROM clients WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- 10. MEMBERSHIP PLANS ACCESS
-- =============================================

-- Clients can view membership plans in their organization
CREATE POLICY "Clients can view membership plans" ON membership_plans
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM clients 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 11. CLIENTS TABLE SELF-ACCESS
-- =============================================

-- Ensure clients can view and update their own record
DROP POLICY IF EXISTS "Users can view own client record" ON clients;
DROP POLICY IF EXISTS "Users can update own client record" ON clients;

CREATE POLICY "Users can view own client record" ON clients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own client record" ON clients
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- VERIFICATION QUERY
-- =============================================

-- This query can be run to verify Sam's data access
/*
-- Check Sam's client record
SELECT 'Client Record' as check_type, 
       id, email, first_name, last_name, organization_id 
FROM clients 
WHERE email = 'sam@atlas-gyms.co.uk';

-- Check if Sam has memberships
SELECT 'Memberships' as check_type, 
       cm.*, mp.name as plan_name
FROM customer_memberships cm
LEFT JOIN membership_plans mp ON cm.membership_plan_id = mp.id
WHERE cm.customer_id IN (
  SELECT id FROM leads WHERE email = 'sam@atlas-gyms.co.uk'
) OR cm.client_id IN (
  SELECT id FROM clients WHERE email = 'sam@atlas-gyms.co.uk'
);

-- Check if Sam has bookings
SELECT 'Bookings' as check_type, 
       COUNT(*) as booking_count
FROM bookings b
WHERE b.customer_id IN (
  SELECT id FROM leads WHERE email = 'sam@atlas-gyms.co.uk'
) OR b.client_id IN (
  SELECT id FROM clients WHERE email = 'sam@atlas-gyms.co.uk'
);
*/