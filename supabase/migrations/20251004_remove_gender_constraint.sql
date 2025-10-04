-- Remove gender check constraint from clients table to allow flexible gender values
-- This constraint was preventing imports with various gender formats

-- Drop the constraint if it exists
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_gender_check;

-- Verify constraint was removed
SELECT conname
FROM pg_constraint
WHERE conname = 'clients_gender_check';
