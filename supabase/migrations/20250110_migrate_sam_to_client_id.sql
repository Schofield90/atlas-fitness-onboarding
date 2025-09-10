-- =============================================
-- MIGRATE SAM'S DATA TO USE CLIENT_ID
-- Migration: 20250110_migrate_sam_to_client_id
-- Purpose: Migrate Sam's data from customer_id to client_id for proper client portal access
-- =============================================

-- 1. Create new membership linked to client (if old one still exists)
INSERT INTO customer_memberships (
  organization_id,
  client_id,
  membership_plan_id,
  status,
  start_date,
  end_date,
  next_billing_date,
  stripe_subscription_id,
  notes,
  classes_used_this_period
)
SELECT 
  organization_id,
  '25815bb6-91e2-4c17-8386-fde8a7a0722d' as client_id,
  membership_plan_id,
  status,
  start_date,
  end_date,
  next_billing_date,
  stripe_subscription_id,
  notes,
  classes_used_this_period
FROM customer_memberships
WHERE id = '0b9bc09b-29f9-4ce8-b801-bdddcd5ab94c'
  AND NOT EXISTS (
    SELECT 1 FROM customer_memberships 
    WHERE client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
    AND membership_plan_id = '3c3cc6a1-5433-4794-be8f-bd9f43dda462'
  );

-- 2. Delete the old membership that uses customer_id
DELETE FROM customer_memberships 
WHERE id = '0b9bc09b-29f9-4ce8-b801-bdddcd5ab94c';

-- 3. Migrate bookings from customer_id to client_id
UPDATE bookings 
SET client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d',
    customer_id = NULL
WHERE customer_id = '2b4bc52b-9144-4027-832a-4ae5b300a941'
  AND client_id IS NULL;

-- 4. Migrate class credits from customer_id to client_id
UPDATE class_credits 
SET client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d',
    customer_id = NULL
WHERE customer_id = '2b4bc52b-9144-4027-832a-4ae5b300a941'
  AND client_id IS NULL;

-- 5. Link the lead to the client for reference
UPDATE leads 
SET client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
WHERE id = '2b4bc52b-9144-4027-832a-4ae5b300a941' 
  AND client_id IS NULL;

-- 6. Log the migration results
DO $$
DECLARE
  v_membership_count INT;
  v_booking_count INT;
  v_credit_count INT;
BEGIN
  SELECT COUNT(*) INTO v_membership_count
  FROM customer_memberships 
  WHERE client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d';
  
  SELECT COUNT(*) INTO v_booking_count
  FROM bookings 
  WHERE client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d';
  
  SELECT COUNT(*) INTO v_credit_count
  FROM class_credits 
  WHERE client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d';
  
  RAISE NOTICE 'Migration complete - Memberships: %, Bookings: %, Credits: %', 
    v_membership_count, v_booking_count, v_credit_count;
END $$;