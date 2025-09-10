-- 1. Check Sam's client record and organization
SELECT 
  c.id as client_id,
  c.email,
  c.organization_id,
  o.name as org_name
FROM clients c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.email = 'samschofield90@hotmail.co.uk';

-- 2. Check if there are any class_sessions for this organization
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN start_time >= NOW() THEN 1 END) as future_sessions,
  MIN(start_time) as earliest_session,
  MAX(start_time) as latest_session
FROM class_sessions
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- 3. Get a sample of class sessions for this week
SELECT 
  cs.id,
  cs.start_time,
  cs.end_time,
  p.name as program_name,
  cs.max_capacity
FROM class_sessions cs
LEFT JOIN programs p ON p.id = cs.program_id
WHERE cs.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND cs.start_time >= CURRENT_DATE
  AND cs.start_time <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY cs.start_time
LIMIT 10;