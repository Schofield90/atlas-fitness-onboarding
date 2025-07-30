-- Fix events with incorrect organization IDs
-- Update events that have user IDs as organization IDs

UPDATE calendar_events
SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
WHERE organization_id IN (
  SELECT id FROM auth.users
);

-- Show the updated events
SELECT 
  id,
  title,
  start_time,
  organization_id,
  created_by
FROM calendar_events
ORDER BY created_at DESC;