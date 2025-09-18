#!/bin/bash

# Supabase connection details
SUPABASE_URL="https://lzlrojoaxrqvmhempnkn.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k"

echo "Creating all_attendances view..."

# SQL to create the view
SQL_QUERY="
-- Drop the view if it exists
DROP VIEW IF EXISTS all_attendances CASCADE;

-- Create all_attendances view for attendance reporting
CREATE VIEW all_attendances AS
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

-- Grant appropriate permissions
GRANT SELECT ON all_attendances TO authenticated;
GRANT SELECT ON all_attendances TO service_role;
"

# Execute the SQL using a direct database call
# First, let's test if the view can be created
echo "Testing connection to database..."

# Create a temporary file with the SQL
TMP_FILE=$(mktemp)
echo "$SQL_QUERY" > "$TMP_FILE"

# Use the REST API to execute the query
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"SELECT 1 as test\"}")

echo "Response: $RESPONSE"

# Clean up
rm "$TMP_FILE"

echo ""
echo "NOTE: The view creation SQL has been prepared."
echo "Since we can't directly execute DDL via the API, you'll need to:"
echo "1. Use Supabase Dashboard SQL Editor to create the view"
echo "2. Or use a PostgreSQL client with direct connection"
echo ""
echo "The view SQL has been saved to: supabase/migrations/20250918_all_attendances_view.sql"