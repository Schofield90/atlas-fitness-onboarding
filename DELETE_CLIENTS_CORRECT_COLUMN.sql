-- Delete all clients using the correct org_id column
-- The clients table has BOTH org_id and organization_id columns
-- Previous deletions used organization_id (which is NULL for imported clients)
-- We need to use org_id instead

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

-- Step 2: Delete ALL data using org_id (not organization_id!)
DELETE FROM lead_tags;
DELETE FROM bookings;
DELETE FROM class_bookings;
DELETE FROM memberships;
DELETE FROM payments WHERE client_id IN (SELECT id FROM clients);

-- Step 3: Delete all clients (using ANY column that identifies them)
DELETE FROM clients;

-- Step 4: Double-check orphaned records
DELETE FROM lead_tags WHERE client_id IS NOT NULL;

-- Step 5: Recreate the foreign key constraint with NOT VALID
ALTER TABLE lead_tags
  ADD CONSTRAINT lead_tags_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES clients(id)
  ON DELETE CASCADE
  NOT VALID;

-- Step 6: Validate it
ALTER TABLE lead_tags VALIDATE CONSTRAINT lead_tags_client_id_fkey;

-- Step 7: Verify deletion - all should be 0
SELECT
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM lead_tags) as lead_tags,
  (SELECT COUNT(*) FROM memberships) as memberships,
  (SELECT COUNT(*) FROM bookings) as bookings;
