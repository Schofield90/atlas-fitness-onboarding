-- Fix the booking display issue
-- The problem is that class_bookings references schedule_id but the query looks for class_schedules

-- First, let's check what data we have
SELECT 
    cb.id,
    cb.schedule_id,
    cb.client_id,
    cb.status,
    cb.booked_at,
    cs.id as class_schedule_id,
    cs.start_time,
    cs.end_time
FROM class_bookings cb
LEFT JOIN class_schedules cs ON cb.schedule_id = cs.id
WHERE cb.client_id = '1df0e47c-1892-4b1e-ad32-956ebdbf0bab'
ORDER BY cb.booked_at DESC
LIMIT 10;

-- If the above returns NULL for class_schedules, we need to fix the relationship
-- Let's check if we have any class_schedules data
SELECT COUNT(*) as schedule_count FROM class_schedules;

-- Let's also check what's in the schedules table (if it exists)
SELECT COUNT(*) as schedule_count FROM schedules;

-- Now let's see a recent booking to understand the structure
SELECT * FROM class_bookings 
WHERE client_id = '1df0e47c-1892-4b1e-ad32-956ebdbf0bab'
ORDER BY booked_at DESC
LIMIT 1;