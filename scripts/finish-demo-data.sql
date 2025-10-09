-- Complete the demo data setup
-- Organization ID: c762845b-34fc-41ea-9e01-f70b81c44ff7

-- 1. ASSIGN MEMBERSHIPS TO ACTIVE CLIENTS
WITH active_clients AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as row_num
  FROM clients
  WHERE org_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'
  AND status = 'active'
),
membership_plans_list AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY name) as plan_num
  FROM membership_plans
  WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'
)
INSERT INTO customer_memberships (
  organization_id, client_id, membership_plan_id, status, start_date, billing_period, payment_provider
)
SELECT
  'c762845b-34fc-41ea-9e01-f70b81c44ff7'::uuid,
  ac.id,
  (SELECT id FROM membership_plans_list WHERE plan_num = ((ac.row_num % 5) + 1)),
  CASE WHEN RANDOM() < 0.95 THEN 'active' ELSE 'cancelled' END,
  (CURRENT_DATE - (RANDOM() * 180)::INT),
  'monthly',
  'stripe'
FROM active_clients ac;

SELECT '✅ Assigned ' || COUNT(*) || ' memberships' FROM customer_memberships WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

-- 2. CREATE CLASS SCHEDULE (4 weeks)
WITH class_types_list AS (
  SELECT id, name, duration_minutes, default_capacity
  FROM class_types
  WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'
),
date_range AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '21 days',
    INTERVAL '1 day'
  )::DATE as session_date
),
time_slots AS (
  SELECT unnest(ARRAY[6, 9, 12, 17, 19]) as hour
),
session_data AS (
  SELECT
    dr.session_date + make_time(ts.hour, 0, 0) as start_time,
    dr.session_date + make_time(ts.hour, 0, 0) + (ct.duration_minutes || ' minutes')::INTERVAL as end_time,
    ct.id as class_type_id,
    ct.name,
    ct.default_capacity,
    ct.duration_minutes
  FROM date_range dr
  CROSS JOIN time_slots ts
  CROSS JOIN (SELECT * FROM class_types_list ORDER BY RANDOM() LIMIT 1 OFFSET 0) ct
  WHERE EXTRACT(DOW FROM dr.session_date) != 0  -- Skip Sundays
)
INSERT INTO class_sessions (
  organization_id, name, description, start_time, end_time,
  instructor_name, location, max_capacity, duration_minutes, session_status
)
SELECT
  'c762845b-34fc-41ea-9e01-f70b81c44ff7'::uuid,
  sd.name,
  sd.name || ' session',
  sd.start_time,
  sd.end_time,
  (ARRAY['Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'Tom Davies', 'Lisa Martinez'])[FLOOR(RANDOM() * 5 + 1)::INT],
  'Main Studio',
  sd.default_capacity,
  sd.duration_minutes,
  CASE WHEN sd.start_time < NOW() THEN 'completed' ELSE 'scheduled' END
FROM session_data sd;

SELECT '✅ Created ' || COUNT(*) || ' class sessions' FROM class_sessions WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

-- 3. CREATE BOOKINGS (for sessions within 7 days)
WITH active_clients_list AS (
  SELECT id FROM clients
  WHERE org_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'
  AND status = 'active'
),
recent_sessions AS (
  SELECT id, start_time, session_status
  FROM class_sessions
  WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'
  AND ABS(EXTRACT(EPOCH FROM (start_time - NOW())) / 86400) <= 7
),
bookings_raw AS (
  SELECT
    rs.id as session_id,
    ac.id as client_id,
    rs.start_time,
    rs.session_status,
    ROW_NUMBER() OVER (PARTITION BY rs.id ORDER BY RANDOM()) as booking_num
  FROM recent_sessions rs
  CROSS JOIN active_clients_list ac
  WHERE RANDOM() < 0.20  -- 20% chance each client books each session
)
INSERT INTO class_bookings (
  organization_id, client_id, class_session_id, booking_status, booking_date
)
SELECT
  'c762845b-34fc-41ea-9e01-f70b81c44ff7'::uuid,
  client_id,
  session_id,
  CASE
    WHEN session_status = 'completed' THEN
      CASE
        WHEN RANDOM() < 0.80 THEN 'attended'
        WHEN RANDOM() < 0.85 THEN 'no_show'
        ELSE 'cancelled'
      END
    ELSE 'confirmed'
  END,
  (start_time - INTERVAL '1 day')
FROM bookings_raw
WHERE booking_num <= 12;  -- Limit bookings per session

SELECT '✅ Created ' || COUNT(*) || ' bookings' FROM class_bookings WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';
SELECT '   - Attended: ' || COUNT(*) FROM class_bookings WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7' AND booking_status = 'attended';
SELECT '   - No-shows: ' || COUNT(*) FROM class_bookings WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7' AND booking_status = 'no_show';

-- 4. CREATE PAYMENT HISTORY (6 months)
WITH active_memberships AS (
  SELECT
    cm.id as membership_id,
    cm.client_id,
    cm.start_date,
    mp.price,
    FLOOR(EXTRACT(EPOCH FROM (NOW() - cm.start_date::TIMESTAMP)) / (30 * 24 * 60 * 60))::INT as months_since_start,
    CASE WHEN RANDOM() < 0.10 THEN TRUE ELSE FALSE END as has_issues
  FROM customer_memberships cm
  JOIN membership_plans mp ON cm.membership_plan_id = mp.id
  WHERE cm.organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'
  AND cm.status = 'active'
),
payment_records AS (
  SELECT
    am.client_id,
    am.price,
    (am.start_date + (month_offset || ' months')::INTERVAL)::DATE as payment_date,
    CASE
      WHEN month_offset = LEAST(am.months_since_start, 6) - 1 AND am.has_issues THEN 'failed'
      WHEN am.has_issues AND RANDOM() < 0.3 THEN 'failed'
      ELSE 'paid_out'
    END as payment_status,
    'demo_' || FLOOR(RANDOM() * 1000000)::TEXT as provider_id
  FROM active_memberships am
  CROSS JOIN generate_series(0, LEAST(am.months_since_start, 6) - 1) as month_offset
)
INSERT INTO payments (
  organization_id, client_id, amount, currency, payment_status, payment_date,
  payment_provider, provider_payment_id, description, metadata
)
SELECT
  'c762845b-34fc-41ea-9e01-f70b81c44ff7'::uuid,
  client_id,
  price,
  'GBP',
  payment_status,
  payment_date,
  'stripe',
  provider_id,
  'Monthly membership payment',
  '{"demo_data": true}'::jsonb
FROM payment_records;

SELECT '✅ Created ' || COUNT(*) || ' payments' FROM payments WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';
SELECT '   - Successful: ' || COUNT(*) FROM payments WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7' AND payment_status = 'paid_out';
SELECT '   - Failed: ' || COUNT(*) FROM payments WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7' AND payment_status = 'failed';

-- SUMMARY
SELECT '';
SELECT '========================================';
SELECT '✅ DEMO ACCOUNT SETUP COMPLETE!';
SELECT '========================================';
SELECT '';
SELECT '📊 Final Summary:';
SELECT '   Organization: Demo Fitness Studio';
SELECT '   Login: test@test.co.uk / Test123';
SELECT '   URL: https://login.gymleadhub.co.uk';
SELECT '';
