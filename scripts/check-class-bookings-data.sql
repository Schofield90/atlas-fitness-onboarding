-- Check if class_bookings table exists and has data
SELECT 
  cb.id,
  cb.client_id,
  cb.customer_id,
  cb.class_session_id,
  cb.booking_status,
  cb.created_at,
  cs.start_time,
  p.name as program_name
FROM class_bookings cb
LEFT JOIN class_sessions cs ON cs.id = cb.class_session_id
LEFT JOIN programs p ON p.id = cs.program_id
WHERE cb.client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
   OR cb.customer_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
   OR cb.customer_id IN (
     SELECT id FROM leads 
     WHERE client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
        OR email = 'samschofield90@hotmail.co.uk'
   )
ORDER BY cs.start_time ASC
LIMIT 20;