-- Verify bookings display for Sam
-- This query mimics what the bookings page retrieves

SELECT 
  b.id,
  b.client_id,
  b.class_session_id,
  b.status,
  b.booking_date,
  b.created_at,
  -- Class session details
  cs.start_time,
  cs.end_time,
  cs.name as class_name,
  cs.location,
  cs.instructor_name,
  cs.max_capacity,
  cs.current_bookings,
  -- Program details
  p.name as program_name,
  p.description as program_description,
  -- Booking status
  CASE 
    WHEN cs.start_time > NOW() AND b.status = 'confirmed' THEN 'upcoming'
    WHEN cs.start_time <= NOW() THEN 'past'
    ELSE b.status
  END as display_status
FROM bookings b
INNER JOIN class_sessions cs ON cs.id = b.class_session_id
LEFT JOIN programs p ON p.id = cs.program_id
WHERE b.client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
ORDER BY cs.start_time DESC, b.created_at DESC;