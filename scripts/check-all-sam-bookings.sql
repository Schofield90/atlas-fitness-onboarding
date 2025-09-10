-- Check ALL bookings related to Sam (both customer_id and client_id)

-- First, get Sam's IDs
WITH sam_ids AS (
  SELECT 
    c.id as client_id,
    c.email,
    l.id as lead_id
  FROM clients c
  LEFT JOIN leads l ON l.client_id = c.id OR l.email = c.email
  WHERE c.id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
)
-- Now get all bookings
SELECT 
  b.id,
  b.customer_id,
  b.client_id,
  b.class_session_id,
  b.status,
  b.booking_date,
  b.created_at,
  cs.start_time,
  cs.end_time,
  cs.name as class_name,
  p.name as program_name,
  CASE 
    WHEN b.client_id IS NOT NULL THEN 'client_portal'
    WHEN b.customer_id IS NOT NULL THEN 'admin_portal'
  END as booking_source
FROM bookings b
LEFT JOIN class_sessions cs ON cs.id = b.class_session_id
LEFT JOIN programs p ON p.id = cs.program_id
WHERE 
  b.client_id IN (SELECT client_id FROM sam_ids)
  OR b.customer_id IN (SELECT lead_id FROM sam_ids)
ORDER BY cs.start_time ASC;