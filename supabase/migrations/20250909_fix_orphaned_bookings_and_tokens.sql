-- Migration: Fix orphaned bookings and update claim tokens
-- Date: 2025-09-09
-- Purpose: 
-- 1. Add CASCADE DELETE to prevent orphaned bookings when customers are deleted
-- 2. Make expires_at nullable in account_claim_tokens for permanent links

-- ============================================================================
-- PART 1: Fix orphaned bookings issue
-- ============================================================================

-- First, clean up any existing orphaned bookings (where client doesn't exist)
DELETE FROM class_bookings 
WHERE client_id IS NOT NULL 
  AND client_id NOT IN (SELECT id FROM clients);

DELETE FROM class_bookings 
WHERE customer_id IS NOT NULL 
  AND customer_id NOT IN (SELECT leads.id FROM leads);

-- Drop existing foreign key constraints if they exist
ALTER TABLE class_bookings 
  DROP CONSTRAINT IF EXISTS class_bookings_client_id_fkey;

ALTER TABLE class_bookings 
  DROP CONSTRAINT IF EXISTS class_bookings_customer_id_fkey;

-- Add foreign key constraints with CASCADE DELETE
-- When a client is deleted, their bookings will be automatically deleted
ALTER TABLE class_bookings
  ADD CONSTRAINT class_bookings_client_id_fkey
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;

-- When a lead/customer is deleted, their bookings will be automatically deleted  
ALTER TABLE class_bookings
  ADD CONSTRAINT class_bookings_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES leads(id)
  ON DELETE CASCADE;

-- ============================================================================
-- PART 2: Update account_claim_tokens for permanent links
-- ============================================================================

-- Make expires_at nullable to support permanent links
ALTER TABLE account_claim_tokens 
  ALTER COLUMN expires_at DROP NOT NULL;

-- Update existing unexpired tokens to have no expiration
-- (only for tokens that haven't been claimed yet)
UPDATE account_claim_tokens 
SET expires_at = NULL 
WHERE claimed_at IS NULL 
  AND expires_at > NOW();

-- Add a comment to document the change
COMMENT ON COLUMN account_claim_tokens.expires_at IS 
  'Token expiration timestamp. NULL means the token never expires (permanent until claimed).';

-- ============================================================================
-- PART 3: Add indexes for better query performance
-- ============================================================================

-- Add indexes if they don't exist for better booking query performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_client_id 
  ON class_bookings(client_id) 
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_class_bookings_customer_id 
  ON class_bookings(customer_id) 
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_class_bookings_organization_id 
  ON class_bookings(organization_id);

CREATE INDEX IF NOT EXISTS idx_class_bookings_booking_status 
  ON class_bookings(booking_status);

-- Composite index for the common query pattern
CREATE INDEX IF NOT EXISTS idx_class_bookings_org_client_status 
  ON class_bookings(organization_id, client_id, booking_status) 
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_class_bookings_org_customer_status 
  ON class_bookings(organization_id, customer_id, booking_status) 
  WHERE customer_id IS NOT NULL;

-- ============================================================================
-- PART 4: Add helpful check constraint
-- ============================================================================

-- Ensure that only one of client_id or customer_id is set (not both)
ALTER TABLE class_bookings
  DROP CONSTRAINT IF EXISTS check_single_customer_reference;

ALTER TABLE class_bookings
  ADD CONSTRAINT check_single_customer_reference
  CHECK (
    (client_id IS NOT NULL AND customer_id IS NULL) OR
    (client_id IS NULL AND customer_id IS NOT NULL) OR
    (client_id IS NULL AND customer_id IS NULL)
  );

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check the migration worked)
-- ============================================================================

-- Check for any remaining orphaned bookings (should return 0)
/*
SELECT COUNT(*) as orphaned_client_bookings
FROM class_bookings 
WHERE client_id IS NOT NULL 
  AND client_id NOT IN (SELECT id FROM clients);

SELECT COUNT(*) as orphaned_customer_bookings
FROM class_bookings 
WHERE customer_id IS NOT NULL 
  AND customer_id NOT IN (SELECT id FROM leads);

-- Check token expiration status
SELECT 
  COUNT(*) FILTER (WHERE expires_at IS NULL) as permanent_tokens,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL) as expiring_tokens,
  COUNT(*) FILTER (WHERE claimed_at IS NOT NULL) as claimed_tokens
FROM account_claim_tokens;
*/