-- Create all_attendances view for attendance reporting
-- This view combines bookings, class sessions, classes, and clients data
-- to provide a comprehensive attendance dataset

CREATE OR REPLACE VIEW all_attendances AS
SELECT
    -- Booking information
    b.id AS booking_id,
    b.org_id AS organization_id,
    b.created_at AS booking_created_at,
    b.status AS attendance_status,
    b.cancelled_at,
    b.attended_at,

    -- Client information
    b.client_id AS customer_id,
    c.first_name,
    c.last_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    c.membership_tier AS membership_id,

    -- Class session information
    cs.id AS class_session_id,
    cs.start_at AS class_start_at,
    cs.end_at AS class_end_at,
    cs.capacity AS class_capacity,
    cs.status AS class_status,

    -- Class information
    cl.id AS class_type_id,
    cl.name AS class_type_name,
    cl.category AS class_category,
    cl.duration_minutes,
    cl.location AS venue_name,
    cl.location AS venue_id,
    cl.price_cents,

    -- Instructor information
    ARRAY[cs.instructor_id::text] AS instructor_ids,
    u.full_name AS instructor_name,

    -- Additional fields for reporting
    CASE
        WHEN b.metadata->>'booking_method' IS NOT NULL
        THEN b.metadata->>'booking_method'
        ELSE 'manual'
    END AS booking_method,

    CASE
        WHEN b.metadata->>'booking_source' IS NOT NULL
        THEN b.metadata->>'booking_source'
        ELSE 'web'
    END AS booking_source,

    -- Timestamps
    b.created_at,
    b.updated_at

FROM bookings b
JOIN clients c ON b.client_id = c.id
JOIN class_sessions cs ON b.session_id = cs.id
JOIN classes cl ON cs.class_id = cl.id
LEFT JOIN users u ON cs.instructor_id = u.id
WHERE b.org_id IS NOT NULL;

-- Add comment explaining the view
COMMENT ON VIEW all_attendances IS 'Comprehensive view of all attendance data for reporting purposes, combining bookings, clients, class sessions, and classes tables';

-- Grant appropriate permissions
GRANT SELECT ON all_attendances TO authenticated;
GRANT SELECT ON all_attendances TO service_role;