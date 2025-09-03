-- Migration to copy price to price_pennies in membership_plans table
-- This will convert price (in dollars/pounds) to price_pennies (in cents/pence)

-- First, let's check if there are any plans with a price column but null price_pennies
SELECT 
  id, 
  name, 
  price, 
  price_pennies,
  CASE 
    WHEN price IS NOT NULL AND price_pennies IS NULL THEN 'NEEDS MIGRATION'
    WHEN price IS NOT NULL AND price_pennies IS NOT NULL THEN 'ALREADY MIGRATED'
    ELSE 'NO PRICE SET'
  END as migration_status
FROM membership_plans
ORDER BY created_at DESC;

-- Update price_pennies where it's null but price exists
-- Multiply by 100 to convert from main currency units to pennies/cents
UPDATE membership_plans 
SET 
  price_pennies = ROUND(COALESCE(price, 0) * 100),
  updated_at = NOW()
WHERE price IS NOT NULL 
  AND (price_pennies IS NULL OR price_pennies = 0)
  AND price > 0;

-- Also update signup_fee_pennies and cancellation_fee_pennies if they have corresponding fields
-- (These might not exist in the current schema, but adding for completeness)
UPDATE membership_plans 
SET 
  signup_fee_pennies = COALESCE(signup_fee_pennies, 0),
  cancellation_fee_pennies = COALESCE(cancellation_fee_pennies, 0),
  updated_at = NOW()
WHERE signup_fee_pennies IS NULL 
   OR cancellation_fee_pennies IS NULL;

-- Verify the migration
SELECT 
  id, 
  name, 
  price, 
  price_pennies,
  signup_fee_pennies,
  cancellation_fee_pennies,
  CASE 
    WHEN price IS NOT NULL AND price_pennies = (price * 100) THEN 'MIGRATED SUCCESSFULLY'
    WHEN price IS NULL AND price_pennies IS NOT NULL THEN 'PRICE_PENNIES ONLY'
    WHEN price IS NOT NULL AND price_pennies != (price * 100) THEN 'MIGRATION MISMATCH'
    ELSE 'NO DATA'
  END as verification_status
FROM membership_plans
ORDER BY created_at DESC;

-- Show summary of migration
SELECT 
  COUNT(*) as total_plans,
  COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as plans_with_price,
  COUNT(CASE WHEN price_pennies IS NOT NULL THEN 1 END) as plans_with_price_pennies,
  COUNT(CASE WHEN price IS NOT NULL AND price_pennies = (price * 100) THEN 1 END) as successfully_migrated
FROM membership_plans;