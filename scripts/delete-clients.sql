-- Delete all client-related data
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily for bulk operations
SET session_replication_role = replica;

-- Delete in order of dependencies
DELETE FROM lead_tags WHERE client_id IN (SELECT id FROM clients);
DELETE FROM bookings WHERE client_id IN (SELECT id FROM clients);
DELETE FROM class_bookings WHERE client_id IN (SELECT id FROM clients);
DELETE FROM memberships WHERE customer_id IN (SELECT id FROM clients);
DELETE FROM payments WHERE client_id IN (SELECT id FROM clients);

-- Finally delete all clients
DELETE FROM clients;

-- Re-enable RLS
SET session_replication_role = DEFAULT;

-- Verify deletion
SELECT COUNT(*) as remaining_clients FROM clients;
SELECT COUNT(*) as remaining_memberships FROM memberships;
SELECT COUNT(*) as remaining_bookings FROM bookings;
