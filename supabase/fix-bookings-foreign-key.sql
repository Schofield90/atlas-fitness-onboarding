-- Fix bookings table foreign key issue
-- The bookings table has customer_id with a foreign key to non-existent customers table
-- We need to either:
-- 1. Drop the foreign key constraint and add one to clients table
-- 2. Or rename customer_id to client_id

-- Option 1: Drop the bad constraint and add correct one
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;

-- Add foreign key to clients table instead
ALTER TABLE bookings 
ADD CONSTRAINT bookings_customer_id_clients_fkey 
FOREIGN KEY (customer_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;

-- If the above fails because customer_id doesn't exist, try this instead:
-- Option 2: Add client_id column if it doesn't exist
-- ALTER TABLE bookings 
-- ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- To check current structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'bookings';