-- Check programs table for capacity settings
SELECT 
    id,
    name,
    max_participants,
    default_capacity,
    metadata
FROM programs 
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
LIMIT 10;

-- Check class_sessions table for capacity
SELECT 
    cs.id,
    cs.start_time,
    cs.max_capacity,
    cs.capacity,
    p.name as program_name,
    p.max_participants as program_max_participants,
    p.default_capacity as program_default_capacity
FROM class_sessions cs
LEFT JOIN programs p ON cs.program_id = p.id
WHERE cs.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
AND cs.start_time >= NOW()
ORDER BY cs.start_time
LIMIT 10;