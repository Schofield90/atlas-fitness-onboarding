-- Add client profile fields for GoTeamUp import
-- Supports importing full customer data including personal info, address, and emergency contacts

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
