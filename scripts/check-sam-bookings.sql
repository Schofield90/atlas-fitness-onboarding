-- Check Sam's bookings
SELECT 
  b.id,
  b.client_id,
  b.class_session_id,
  b.status,
  b.booking_date,
  b.created_at,
  cs.start_time,
  cs.end_time,
  cs.name as class_name,
  p.name as program_name
FROM bookings b
LEFT JOIN class_sessions cs ON cs.id = b.class_session_id
LEFT JOIN programs p ON p.id = cs.program_id
WHERE b.client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
ORDER BY b.created_at DESC
LIMIT 10;