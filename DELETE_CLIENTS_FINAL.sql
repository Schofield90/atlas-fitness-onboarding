-- Delete all clients - final version
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL foreign key constraints on lead_tags
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'lead_tags'::regclass
        AND contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE lead_tags DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Step 2: Delete ALL data (including orphaned records)
DELETE FROM lead_tags;
DELETE FROM bookings;
DELETE FROM class_bookings;
DELETE FROM memberships;
DELETE FROM payments;
DELETE FROM clients;

-- Step 2.5: Double-check and clean any remaining orphaned lead_tags
DELETE FROM lead_tags WHERE client_id IS NOT NULL;

-- Step 3: Recreate the foreign key constraint with CASCADE (NOT VALID to skip validation)
ALTER TABLE lead_tags
  ADD CONSTRAINT lead_tags_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES clients(id)
  ON DELETE CASCADE
  NOT VALID;

-- Step 4: Validate the constraint (should be fine now since tables are empty)
ALTER TABLE lead_tags VALIDATE CONSTRAINT lead_tags_client_id_fkey;

-- Step 5: Verify deletion - should all be 0
SELECT
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM lead_tags) as lead_tags,
  (SELECT COUNT(*) FROM memberships) as memberships,
  (SELECT COUNT(*) FROM bookings) as bookings,
  (SELECT COUNT(*) FROM class_bookings) as class_bookings,
  (SELECT COUNT(*) FROM payments) as payments;
