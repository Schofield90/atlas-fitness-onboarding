-- Drop the existing view
DROP VIEW IF EXISTS all_attendances CASCADE;

-- Create all_attendances view using the correct tables and columns that exist
CREATE VIEW all_attendances AS
SELECT
    -- Booking information
    cb.id AS booking_id,
    cb.organization_id,
    cb.created_at AS booking_created_at,
    cb.booking_status AS attendance_status,
    cb.cancelled_at,
    cb.attended_at,

    -- Client/Customer information
    COALESCE(cb.client_id, cb.customer_id) AS customer_id,
    c.first_name,
    c.last_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    cb.membership_id,

    -- Class session information
    cb.class_session_id,
    cs.start_time AS class_start_at,
    cs.end_time AS class_end_at,
    cs.capacity AS class_capacity,
    cs.session_status AS class_status,

    -- Class type information (using class_sessions data)
    cs.id AS class_type_id,
    COALESCE(cs.name, 'Class Session') AS class_type_name,
    cs.description AS class_category,
    cs.duration_minutes,
    cs.location AS venue_name,
    COALESCE(cs.location_id, cs.location)::text AS venue_id,
    COALESCE(cs.price, 0)::integer AS price_cents,

    -- Instructor information (using instructor_name from class_sessions)
    ARRAY[cs.instructor_name] AS instructor_ids,
    cs.instructor_name,

    -- Additional fields for reporting
    COALESCE(cb.booking_type, 'manual') AS booking_method,
    'web' AS booking_source,

    -- Timestamps
    cb.created_at,
    cb.updated_at

FROM class_bookings cb
LEFT JOIN clients c ON (cb.client_id = c.id OR cb.customer_id = c.id)
LEFT JOIN class_sessions cs ON cb.class_session_id = cs.id
WHERE cb.organization_id IS NOT NULL;

-- Grant appropriate permissions
GRANT SELECT ON all_attendances TO authenticated;
GRANT SELECT ON all_attendances TO service_role;

-- Add comment explaining the view
COMMENT ON VIEW all_attendances IS 'Comprehensive view of all attendance data for reporting, using class_bookings and class_sessions as the primary sources';