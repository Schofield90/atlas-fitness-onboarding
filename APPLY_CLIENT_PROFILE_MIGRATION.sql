-- ============================================================================
-- ATLAS FITNESS CRM - CLIENT PROFILE FIELDS MIGRATION
-- ============================================================================
--
-- Run this SQL in Supabase Dashboard:
-- https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql
--
-- This migration adds client profile fields needed for GoTeamUp import:
-- - Full name, gender, date of birth
-- - Address (JSONB)
-- - Emergency contact information (JSONB)
--
-- ============================================================================

-- Add client profile fields for GoTeamUp import
ALTER TABLE clients
  -- Personal information
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,

  -- Emergency contact fields (for backward compatibility)
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,

  -- Structured data fields
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS emergency_contact JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_date_of_birth ON clients(date_of_birth);

-- Add comments explaining these fields
COMMENT ON COLUMN clients.name IS 'Full name of the client';
COMMENT ON COLUMN clients.gender IS 'Gender of the client';
COMMENT ON COLUMN clients.date_of_birth IS 'Date of birth';
COMMENT ON COLUMN clients.emergency_contact_name IS 'Emergency contact name (legacy field)';
COMMENT ON COLUMN clients.emergency_contact_phone IS 'Emergency contact phone (legacy field)';
COMMENT ON COLUMN clients.address IS 'Address as JSON object {line1, line2, city, region, postcode, country}';
COMMENT ON COLUMN clients.emergency_contact IS 'Emergency contact as JSON object {name, phone, relationship}';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify columns were added
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name IN ('name', 'gender', 'date_of_birth', 'address', 'emergency_contact', 'emergency_contact_name', 'emergency_contact_phone')
ORDER BY column_name;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Client profile migration applied successfully!';
  RAISE NOTICE '📋 Added fields: name, gender, date_of_birth, address, emergency_contact';
  RAISE NOTICE '🔄 You can now re-import GoTeamUp customer data';
END $$;
