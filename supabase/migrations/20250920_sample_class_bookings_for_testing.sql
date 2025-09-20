-- Sample class bookings for testing customer leaderboard functionality
-- This creates realistic booking data for existing class sessions

-- First, let's create some sample bookings for existing class sessions
-- We'll link real clients to real class sessions with realistic booking statuses

INSERT INTO class_bookings (
    id,
    organization_id,
    client_id,
    customer_id,
    class_session_id,
    booking_status,
    booking_type,
    created_at,
    updated_at,
    attended_at
)
SELECT 
    gen_random_uuid() as id,
    cs.organization_id,
    -- Use existing clients from the organization
    (SELECT c.id FROM clients c WHERE c.organization_id = cs.organization_id ORDER BY random() LIMIT 1) as client_id,
    NULL as customer_id,
    cs.id as class_session_id,
    -- Mix of booking statuses for realistic data
    CASE 
        WHEN random() < 0.6 THEN 'confirmed'
        WHEN random() < 0.8 THEN 'attended' 
        WHEN random() < 0.9 THEN 'completed'
        ELSE 'no_show'
    END as booking_status,
    'manual' as booking_type,
    -- Random booking dates within the last 30 days
    NOW() - (random() * interval '30 days') as created_at,
    NOW() - (random() * interval '25 days') as updated_at,
    -- Set attended_at for attended/completed bookings
    CASE 
        WHEN random() < 0.7 THEN cs.start_time + interval '5 minutes'
        ELSE NULL
    END as attended_at
FROM class_sessions cs
WHERE cs.organization_id IS NOT NULL
  AND cs.start_time >= NOW() - interval '60 days'  -- Only recent sessions
  AND cs.start_time <= NOW() + interval '7 days'   -- Include upcoming sessions
  AND random() < 0.3  -- Only create bookings for ~30% of sessions to be realistic
LIMIT 50;  -- Limit to 50 sample bookings

-- Add some additional bookings for popular classes (simulate repeat customers)
INSERT INTO class_bookings (
    id,
    organization_id,
    client_id,
    customer_id,
    class_session_id,
    booking_status,
    booking_type,
    created_at,
    updated_at,
    attended_at
)
SELECT 
    gen_random_uuid() as id,
    cs.organization_id,
    -- Use the same clients again for some sessions (repeat customers)
    (SELECT c.id FROM clients c WHERE c.organization_id = cs.organization_id ORDER BY random() LIMIT 1) as client_id,
    NULL as customer_id,
    cs.id as class_session_id,
    -- Higher attendance rate for repeat customers
    CASE 
        WHEN random() < 0.8 THEN 'attended'
        ELSE 'confirmed'
    END as booking_status,
    'online' as booking_type,
    cs.start_time - interval '2 days' as created_at,
    cs.start_time - interval '1 day' as updated_at,
    -- Most repeat customers attend
    CASE 
        WHEN random() < 0.9 THEN cs.start_time + interval '3 minutes'
        ELSE NULL
    END as attended_at
FROM class_sessions cs
WHERE cs.organization_id IS NOT NULL
  AND cs.start_time >= NOW() - interval '30 days'
  AND cs.start_time <= NOW()  -- Only past sessions for this batch
  AND EXISTS (
    SELECT 1 FROM class_bookings cb 
    WHERE cb.class_session_id = cs.id
  )  -- Only add repeat bookings where we already have a booking
  AND random() < 0.4  -- 40% chance of repeat booking
LIMIT 20;  -- Limit additional bookings

-- Add comment explaining the purpose
COMMENT ON TABLE class_bookings IS 'Class bookings table with sample data for testing customer leaderboard functionality';