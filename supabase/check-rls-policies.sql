-- Check RLS status on relevant tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('class_sessions', 'bookings', 'leads', 'organizations', 'programs');

-- Check existing RLS policies on bookings table
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polpermissive as permissive,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression,
    rol.rolname as role_name
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
LEFT JOIN pg_roles rol ON pol.polroles @> ARRAY[rol.oid]
WHERE nsp.nspname = 'public' 
AND cls.relname = 'bookings';

-- Check if bookings are visible with current auth context
-- This simulates what the API would see
SELECT 
    cs.id,
    cs.start_time,
    cs.capacity,
    COUNT(b.id) as booking_count,
    array_agg(b.id) as booking_ids
FROM class_sessions cs
LEFT JOIN bookings b ON b.class_session_id = cs.id
WHERE cs.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND cs.start_time >= '2025-08-04'::timestamp
  AND cs.start_time <= '2025-08-10'::timestamp
GROUP BY cs.id
ORDER BY cs.start_time;

-- Check if any bookings exist for the organization's classes
SELECT 
    b.*,
    cs.start_time,
    cs.organization_id
FROM bookings b
JOIN class_sessions cs ON b.class_session_id = cs.id
WHERE cs.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY b.created_at DESC
LIMIT 10;