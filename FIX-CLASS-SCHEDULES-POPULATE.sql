-- First, check what columns class_schedules actually has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'class_schedules' 
ORDER BY ordinal_position;

-- Populate class_schedules table with data from schedules
-- Using only the columns that actually exist
INSERT INTO class_schedules (
    id,
    start_time,
    end_time,
    instructor_name,
    room_location,
    max_capacity,
    price_pennies,
    organization_id,
    created_at
)
SELECT 
    id,
    start_time,
    end_time,
    'TBD' as instructor_name,
    location as room_location,
    20 as max_capacity,
    0 as price_pennies,
    organization_id,
    created_at
FROM schedules
WHERE NOT EXISTS (
    SELECT 1 FROM class_schedules cs WHERE cs.id = schedules.id
)
AND organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- Create a default class type if none exists
INSERT INTO class_types (id, name, description, color, organization_id)
VALUES (
    gen_random_uuid(),
    'General Class',
    'General fitness class',
    '#3B82F6',
    '63589490-8f55-4157-bd3a-e141594b748e'
)
ON CONFLICT DO NOTHING;

-- Update class_schedules to have a class_type_id
UPDATE class_schedules 
SET class_type_id = (SELECT id FROM class_types WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e' LIMIT 1)
WHERE class_type_id IS NULL 
AND organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- Verify the data was inserted
SELECT COUNT(*) as schedule_count FROM class_schedules WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- Check a sample of the data
SELECT 
    cs.id,
    cs.start_time,
    cs.instructor_name,
    cs.room_location,
    ct.name as class_type_name
FROM class_schedules cs
LEFT JOIN class_types ct ON cs.class_type_id = ct.id
WHERE cs.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY cs.start_time DESC
LIMIT 5;