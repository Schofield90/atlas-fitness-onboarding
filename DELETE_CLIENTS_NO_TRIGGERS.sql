-- Delete all clients by temporarily removing foreign key constraints
-- Run this in Supabase SQL Editor

-- Step 1: Drop the problematic foreign key constraint
ALTER TABLE lead_tags DROP CONSTRAINT IF EXISTS lead_tags_client_id_fkey;

-- Step 2: Delete all data
DELETE FROM lead_tags;
DELETE FROM bookings;
DELETE FROM class_bookings;
DELETE FROM memberships;
DELETE FROM payments;
DELETE FROM clients;

-- Step 3: Recreate the foreign key constraint
ALTER TABLE lead_tags
  ADD CONSTRAINT lead_tags_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES clients(id)
  ON DELETE CASCADE;

-- Step 4: Verify deletion
SELECT
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM lead_tags) as lead_tags,
  (SELECT COUNT(*) FROM memberships) as memberships,
  (SELECT COUNT(*) FROM bookings) as bookings,
  (SELECT COUNT(*) FROM class_bookings) as class_bookings,
  (SELECT COUNT(*) FROM payments) as payments;
