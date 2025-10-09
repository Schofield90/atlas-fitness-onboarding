-- ============================================================================
-- Demo Account Data Setup Script
-- Creates comprehensive demo environment for Atlas Fitness CRM
-- ============================================================================

-- Get organization ID
DO $$
DECLARE
  v_org_id UUID := 'c762845b-34fc-41ea-9e01-f70b81c44ff7';
BEGIN

-- ============================================================================
-- 1. CREATE MEMBERSHIP PLANS
-- ============================================================================

INSERT INTO membership_plans (
  organization_id, name, description, price, billing_period, category, payment_provider, is_active
) VALUES
  (v_org_id, 'Trial Pass', '1-week trial membership', 20, 'one_time', 'trial', 'stripe', true),
  (v_org_id, 'Basic Monthly', '4 classes per month', 49, 'monthly', 'basic', 'stripe', true),
  (v_org_id, 'Premium Monthly', '12 classes per month', 89, 'monthly', 'premium', 'stripe', true),
  (v_org_id, 'Elite Unlimited', 'Unlimited classes', 129, 'monthly', 'elite', 'stripe', true),
  (v_org_id, 'VIP Annual', 'Unlimited classes + PT sessions', 1200, 'yearly', 'vip', 'stripe', true)
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Created 5 membership plans';

-- ============================================================================
-- 2. CREATE CLASS TYPES
-- ============================================================================

INSERT INTO class_types (
  organization_id, name, description, duration_minutes, default_capacity
) VALUES
  (v_org_id, 'Yoga Flow', 'Vinyasa-style flowing yoga', 60, 20),
  (v_org_id, 'HIIT Training', 'High-intensity interval training', 45, 15),
  (v_org_id, 'Strength & Conditioning', 'Weight training and conditioning', 60, 12),
  (v_org_id, 'Spin Class', 'Indoor cycling workout', 45, 20),
  (v_org_id, 'Boxing Fundamentals', 'Boxing techniques and cardio', 60, 15),
  (v_org_id, 'Pilates Core', 'Core-focused Pilates', 50, 18),
  (v_org_id, 'CrossFit WOD', 'Workout of the day', 60, 12),
  (v_org_id, 'Zumba Dance', 'Dance fitness party', 45, 25)
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Created 8 class types';

-- ============================================================================
-- 3. CREATE 50 DEMO CLIENTS
-- ============================================================================

-- Helper arrays for name generation
-- This creates realistic diverse client profiles
WITH client_data AS (
  SELECT
    v_org_id as organization_id,
    first_names.name as first_name,
    last_names.name as last_name,
    LOWER(first_names.name || '.' || last_names.name || '@' ||
      (ARRAY['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'])[FLOOR(RANDOM() * 5 + 1)::INT]
    ) as email,
    '07' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0') as phone,
    CASE
      WHEN RANDOM() < 0.85 THEN 'active'
      WHEN RANDOM() < 0.95 THEN 'inactive'
      ELSE 'archived'
    END as status,
    'demo_data' as source,
    CASE
      WHEN RANDOM() < 0.85 THEN ARRAY['member', 'active']
      ELSE ARRAY['lead']
    END as tags,
    jsonb_build_object(
      'lead_score', CASE
        WHEN RANDOM() < 0.85 THEN 60 + FLOOR(RANDOM() * 35)
        WHEN RANDOM() < 0.95 THEN 30 + FLOOR(RANDOM() * 30)
        ELSE 10 + FLOOR(RANDOM() * 30)
      END,
      'engagement_level', CASE
        WHEN RANDOM() < 0.85 THEN (ARRAY['high', 'medium'])[FLOOR(RANDOM() * 2 + 1)::INT]
        ELSE 'low'
      END,
      'joined_date', (NOW() - (RANDOM() * INTERVAL '12 months'))::DATE,
      'demo_account', true
    ) as metadata,
    ROW_NUMBER() OVER () as row_num
  FROM
    (SELECT unnest(ARRAY['James', 'Emma', 'Oliver', 'Sophia', 'William', 'Ava', 'Noah', 'Isabella',
      'Liam', 'Mia', 'Mason', 'Charlotte', 'Ethan', 'Amelia', 'Lucas', 'Harper',
      'Logan', 'Evelyn', 'Alexander', 'Abigail', 'Jacob', 'Emily', 'Michael', 'Elizabeth',
      'Benjamin', 'Sofia', 'Elijah', 'Avery', 'Daniel', 'Ella', 'Matthew', 'Scarlett',
      'Henry', 'Grace', 'Jackson', 'Chloe', 'Sebastian', 'Victoria', 'Aiden', 'Riley',
      'Samuel', 'Aria', 'David', 'Lily', 'Joseph', 'Aubrey', 'Carter', 'Zoey', 'Owen', 'Penelope']) as name) as first_names,
    (SELECT unnest(ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
      'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
      'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
      'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
      'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Phillips']) as name) as last_names
  LIMIT 50
)
INSERT INTO clients (
  organization_id, first_name, last_name, email, phone, status, source, tags, metadata, created_at
)
SELECT
  organization_id, first_name, last_name, email, phone, status, source, tags, metadata, NOW()
FROM client_data
ON CONFLICT (organization_id, email) DO NOTHING;

RAISE NOTICE '✅ Created 50 demo clients';

-- ============================================================================
-- 4. ASSIGN MEMBERSHIPS TO ACTIVE CLIENTS
-- ============================================================================

WITH active_clients AS (
  SELECT id, metadata->>'joined_date' as joined_date
  FROM clients
  WHERE organization_id = v_org_id
  AND status = 'active'
  ORDER BY RANDOM()
),
membership_assignment AS (
  SELECT
    ac.id as client_id,
    ac.joined_date::DATE as start_date,
    CASE
      WHEN row_num % 20 = 1 THEN (SELECT id FROM membership_plans WHERE organization_id = v_org_id AND name = 'Trial Pass' LIMIT 1)
      WHEN row_num % 20 BETWEEN 2 AND 7 THEN (SELECT id FROM membership_plans WHERE organization_id = v_org_id AND name = 'Basic Monthly' LIMIT 1)
      WHEN row_num % 20 BETWEEN 8 AND 15 THEN (SELECT id FROM membership_plans WHERE organization_id = v_org_id AND name = 'Premium Monthly' LIMIT 1)
      WHEN row_num % 20 BETWEEN 16 AND 18 THEN (SELECT id FROM membership_plans WHERE organization_id = v_org_id AND name = 'Elite Unlimited' LIMIT 1)
      ELSE (SELECT id FROM membership_plans WHERE organization_id = v_org_id AND name = 'VIP Annual' LIMIT 1)
    END as plan_id,
    CASE WHEN RANDOM() < 0.95 THEN 'active' ELSE 'cancelled' END as status,
    CASE
      WHEN row_num % 5 = 0 THEN 'yearly'
      ELSE 'monthly'
    END as billing_period
  FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY RANDOM()) as row_num FROM active_clients) ac
)
INSERT INTO customer_memberships (
  organization_id, client_id, plan_id, status, start_date, billing_period, payment_provider
)
SELECT
  v_org_id, client_id, plan_id, status, start_date, billing_period, 'stripe'
FROM membership_assignment
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Assigned memberships to active clients';

-- ============================================================================
-- 5. CREATE 4 WEEKS OF CLASS SCHEDULE
-- ============================================================================

WITH
  date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '21 days',
      INTERVAL '1 day'
    )::DATE as class_date
  ),
  time_slots AS (
    SELECT unnest(ARRAY['06:00:00', '09:00:00', '12:00:00', '17:00:00', '19:00:00'])::TIME as class_time
  ),
  class_sessions_data AS (
    SELECT
      v_org_id as organization_id,
      ct.name,
      ct.description,
      (ds.class_date + ts.class_time)::TIMESTAMP as start_time,
      (ds.class_date + ts.class_time + (ct.duration_minutes || ' minutes')::INTERVAL)::TIMESTAMP as end_time,
      (ARRAY['Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'Tom Davies', 'Lisa Martinez'])[FLOOR(RANDOM() * 5 + 1)::INT] as instructor_name,
      'Main Studio' as location,
      ct.default_capacity as max_capacity,
      ct.duration_minutes,
      CASE
        WHEN ds.class_date < CURRENT_DATE THEN 'completed'
        ELSE 'scheduled'
      END as session_status
    FROM date_series ds
    CROSS JOIN time_slots ts
    CROSS JOIN (
      SELECT * FROM class_types
      WHERE organization_id = v_org_id
      ORDER BY RANDOM()
      LIMIT 1
    ) ct
    WHERE EXTRACT(DOW FROM ds.class_date) != 0  -- Skip Sundays
  )
INSERT INTO class_sessions (
  organization_id, name, description, start_time, end_time,
  instructor_name, location, max_capacity, duration_minutes, session_status, created_at
)
SELECT
  organization_id, name, description, start_time, end_time,
  instructor_name, location, max_capacity, duration_minutes, session_status, NOW()
FROM class_sessions_data
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Created 4 weeks of class schedule';

-- ============================================================================
-- 6. CREATE BOOKINGS AND ATTENDANCE
-- ============================================================================

WITH active_members AS (
  SELECT c.id, c.first_name, c.last_name
  FROM clients c
  WHERE c.organization_id = v_org_id
  AND c.status = 'active'
),
bookable_sessions AS (
  SELECT *
  FROM class_sessions
  WHERE organization_id = v_org_id
  AND start_time < NOW() + INTERVAL '7 days'
),
booking_assignments AS (
  SELECT
    v_org_id as organization_id,
    am.id as client_id,
    bs.id as class_session_id,
    CASE
      WHEN bs.start_time < NOW() THEN
        CASE
          WHEN RANDOM() < 0.80 THEN 'attended'
          WHEN RANDOM() < 0.85 THEN 'no_show'
          ELSE 'cancelled'
        END
      ELSE 'confirmed'
    END as booking_status,
    (bs.start_time - INTERVAL '1 day')::TIMESTAMP as booking_date,
    ROW_NUMBER() OVER (PARTITION BY bs.id) as booking_num
  FROM bookable_sessions bs
  CROSS JOIN active_members am
  WHERE RANDOM() < 0.15  -- Each member has 15% chance to book each class
)
INSERT INTO class_bookings (
  organization_id, client_id, class_session_id, booking_status, booking_date, created_at
)
SELECT
  organization_id, client_id, class_session_id, booking_status, booking_date, NOW()
FROM booking_assignments
WHERE booking_num <= (SELECT AVG(max_capacity) * 0.75 FROM class_sessions WHERE organization_id = v_org_id)::INT
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Created bookings and attendance records';

-- ============================================================================
-- 7. CREATE 6 MONTHS OF PAYMENT HISTORY
-- ============================================================================

WITH active_memberships AS (
  SELECT
    cm.id as membership_id,
    cm.client_id,
    cm.start_date,
    mp.price,
    mp.billing_period,
    FLOOR(EXTRACT(EPOCH FROM (NOW() - cm.start_date::TIMESTAMP)) / (30 * 24 * 60 * 60))::INT as months_active,
    CASE WHEN RANDOM() < 0.10 THEN true ELSE false END as has_payment_issues
  FROM customer_memberships cm
  JOIN membership_plans mp ON cm.plan_id = mp.id
  WHERE cm.organization_id = v_org_id
  AND cm.status = 'active'
),
payment_months AS (
  SELECT
    am.*,
    generate_series(0, LEAST(am.months_active, 6) - 1) as month_offset
  FROM active_memberships am
),
payment_records AS (
  SELECT
    v_org_id as organization_id,
    pm.client_id,
    pm.price as amount,
    'GBP' as currency,
    CASE
      WHEN pm.month_offset = pm.months_active AND pm.has_payment_issues THEN 'failed'
      WHEN pm.has_payment_issues AND RANDOM() < 0.3 THEN 'failed'
      ELSE 'paid_out'
    END as payment_status,
    (pm.start_date + (pm.month_offset || ' months')::INTERVAL)::DATE as payment_date,
    'stripe' as payment_provider,
    'demo_' || gen_random_uuid()::TEXT as provider_payment_id,
    pm.billing_period || ' membership payment' as description,
    jsonb_build_object(
      'membership_id', pm.membership_id,
      'demo_data', true
    ) as metadata
  FROM payment_months pm
)
INSERT INTO payments (
  organization_id, client_id, amount, currency, payment_status, payment_date,
  payment_provider, provider_payment_id, description, metadata, created_at
)
SELECT
  organization_id, client_id, amount, currency, payment_status, payment_date,
  payment_provider, provider_payment_id, description, metadata, NOW()
FROM payment_records
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Created 6 months of payment history';

END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== DEMO ACCOUNT SETUP COMPLETE ===' as message;

SELECT
  'Clients' as type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'inactive') as inactive
FROM clients
WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'

UNION ALL

SELECT
  'Membership Plans' as type,
  COUNT(*) as count,
  NULL as active,
  NULL as inactive
FROM membership_plans
WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'

UNION ALL

SELECT
  'Class Types' as type,
  COUNT(*) as count,
  NULL as active,
  NULL as inactive
FROM class_types
WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'

UNION ALL

SELECT
  'Class Sessions' as type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE session_status = 'completed') as active,
  COUNT(*) FILTER (WHERE session_status = 'scheduled') as inactive
FROM class_sessions
WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'

UNION ALL

SELECT
  'Bookings' as type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE booking_status = 'attended') as active,
  COUNT(*) FILTER (WHERE booking_status = 'no_show') as inactive
FROM class_bookings
WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'

UNION ALL

SELECT
  'Payments' as type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE payment_status = 'paid_out') as active,
  COUNT(*) FILTER (WHERE payment_status = 'failed') as inactive
FROM payments
WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';
