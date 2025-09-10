-- Verify Sam's data migration
SELECT 
  'Membership' as type,
  COUNT(*) as count
FROM customer_memberships cm
WHERE cm.client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
UNION ALL
SELECT 
  'Bookings' as type,
  COUNT(*) as count
FROM bookings b
WHERE b.client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
UNION ALL
SELECT 
  'Credits' as type,
  COUNT(*) as count
FROM class_credits cc
WHERE cc.client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d';