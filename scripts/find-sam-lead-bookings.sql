-- Find Sam's lead record and associated bookings
SELECT 
  l.id as lead_id,
  l.email,
  l.name,
  l.client_id,
  COUNT(b.id) as booking_count
FROM leads l
LEFT JOIN bookings b ON b.customer_id = l.id
WHERE l.email = 'samschofield90@hotmail.co.uk'
   OR l.client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
GROUP BY l.id, l.email, l.name, l.client_id;

-- Show the actual bookings
SELECT 
  b.id,
  b.customer_id,
  b.class_session_id,
  b.status,
  cs.start_time,
  p.name as program_name
FROM bookings b
JOIN class_sessions cs ON cs.id = b.class_session_id
LEFT JOIN programs p ON p.id = cs.program_id
WHERE b.customer_id IN (
  SELECT id FROM leads 
  WHERE email = 'samschofield90@hotmail.co.uk'
     OR client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
)
ORDER BY cs.start_time;