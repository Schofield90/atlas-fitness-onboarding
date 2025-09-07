-- Populate class_schedules table with data from schedules
-- This ensures that class bookings can properly reference class schedule data

-- First, check if we have any data in class_schedules
SELECT COUNT(*) as existing_schedules FROM class_schedules;

-- If empty, populate from schedules table
INSERT INTO class_schedules (
    id,
    title,
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
    name as title,
    start_time,
    end_time,
    'TBD' as instructor_name,  -- Default instructor
    location as room_location,
    20 as max_capacity,  -- Default capacity
    0 as price_pennies,  -- Default price
    organization_id,
    created_at
FROM schedules
WHERE NOT EXISTS (
    SELECT 1 FROM class_schedules cs WHERE cs.id = schedules.id
);

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
SET class_type_id = (SELECT id FROM class_types LIMIT 1)
WHERE class_type_id IS NULL;

-- Verify the data
SELECT 
    cs.id,
    cs.title,
    cs.start_time,
    cs.instructor_name,
    ct.name as class_type_name
FROM class_schedules cs
LEFT JOIN class_types ct ON cs.class_type_id = ct.id
ORDER BY cs.start_time DESC
LIMIT 5;