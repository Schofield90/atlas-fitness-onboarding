-- Immediate fix for last_visit_date showing as "Never"
-- Run this directly in Supabase SQL Editor

-- Step 1: Update all clients with their actual last visit from class_bookings
UPDATE clients c
SET 
  last_visit_date = subquery.last_booking_date,
  total_visits = subquery.booking_count,
  updated_at = NOW()
FROM (
  SELECT 
    COALESCE(cb.client_id, cb.customer_id) as client_id,
    MAX(cb.booking_date) as last_booking_date,
    COUNT(*) as booking_count
  FROM class_bookings cb
  WHERE cb.booking_status = 'confirmed'
  GROUP BY COALESCE(cb.client_id, cb.customer_id)
) AS subquery
WHERE c.id = subquery.client_id;

-- Step 2: Show results to verify
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.last_visit_date,
    c.total_visits,
    COUNT(cb.id) as actual_bookings
FROM clients c
LEFT JOIN class_bookings cb ON (cb.client_id = c.id OR cb.customer_id = c.id) 
    AND cb.booking_status = 'confirmed'
WHERE c.organization_id IS NOT NULL
GROUP BY c.id, c.first_name, c.last_name, c.last_visit_date, c.total_visits
ORDER BY c.last_visit_date DESC NULLS LAST
LIMIT 20;