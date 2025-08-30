-- Add name and hourly_rate columns to organization_staff table
ALTER TABLE organization_staff 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 0.00;

-- Update the name column with email prefix for existing records
UPDATE organization_staff 
SET name = split_part(email, '@', 1)
WHERE name IS NULL;