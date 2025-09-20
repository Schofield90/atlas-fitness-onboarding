-- Script to delete test class sessions from the database
-- This will remove any sample/test data that was created for testing purposes

-- First, let's see what we have
SELECT 
    id,
    name,
    description,
    start_time,
    created_at,
    organization_id
FROM class_sessions
WHERE organization_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Delete test sessions that match common test patterns
-- These are likely test data based on generic names or descriptions
DELETE FROM class_sessions
WHERE (
    -- Generic test class names
    name ILIKE '%test%' 
    OR name ILIKE '%sample%'
    OR name ILIKE '%demo%'
    OR name = 'Morning Yoga'
    OR name = 'HIIT Training'
    OR name = 'Strength Training'
    OR name = 'Evening Pilates'
    OR name = 'Spin Class'
    OR name = 'CrossFit'
    OR name = 'Boxing'
    OR name = 'Zumba'
    
    -- Or sessions with generic instructor names in description
    OR description ILIKE '%instructor: john%'
    OR description ILIKE '%instructor: sarah%'
    OR description ILIKE '%instructor: mike%'
    OR description ILIKE '%instructor: emma%'
    OR description ILIKE '%instructor: alex%'
    OR description ILIKE '%instructor: lisa%'
    
    -- Or sessions created by seed scripts (usually have similar timestamps)
    OR (
        created_at::date IN (
            SELECT created_at::date 
            FROM class_sessions 
            GROUP BY created_at::date 
            HAVING COUNT(*) > 5  -- Multiple sessions created on same date likely test data
        )
        AND name IN ('Morning Yoga', 'HIIT Training', 'Strength Training', 'Evening Pilates', 'Spin Class', 'CrossFit', 'Boxing', 'Zumba')
    )
)
AND organization_id IS NOT NULL
RETURNING id, name, start_time;

-- Show remaining sessions after cleanup
SELECT 
    id,
    name,
    description,
    start_time,
    max_capacity,
    current_bookings,
    organization_id
FROM class_sessions
WHERE organization_id IS NOT NULL
ORDER BY start_time DESC;

-- Count remaining sessions
SELECT COUNT(*) as remaining_sessions 
FROM class_sessions 
WHERE organization_id IS NOT NULL;