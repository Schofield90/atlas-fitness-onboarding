-- ☢️ NUCLEAR DELETE - Run this in Supabase SQL Editor
-- This will delete ALL clients and related data

-- First, check what's preventing deletion
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'clients';

-- Disable triggers temporarily
ALTER TABLE lead_tags DISABLE TRIGGER ALL;
ALTER TABLE clients DISABLE TRIGGER ALL;

-- Delete all related data
DELETE FROM lead_tags;
DELETE FROM bookings;
DELETE FROM class_bookings;
DELETE FROM memberships;
DELETE FROM payments;

-- Delete all clients
DELETE FROM clients;

-- Re-enable triggers
ALTER TABLE lead_tags ENABLE TRIGGER ALL;
ALTER TABLE clients ENABLE TRIGGER ALL;

-- Verify deletion
SELECT
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM lead_tags) as lead_tags,
  (SELECT COUNT(*) FROM memberships) as memberships,
  (SELECT COUNT(*) FROM bookings) as bookings;
