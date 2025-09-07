-- Fix database schema issues for membership and booking system
-- This migration addresses column mismatches identified by the mapper

-- 1. Add missing classes_used_this_period column to customer_memberships
ALTER TABLE customer_memberships 
ADD COLUMN IF NOT EXISTS classes_used_this_period INTEGER DEFAULT 0;

-- 2. Add classes_per_period column to membership_plans for frontend compatibility
-- Keep class_limit for backward compatibility, but add classes_per_period as an alias
ALTER TABLE membership_plans 
ADD COLUMN IF NOT EXISTS classes_per_period INTEGER;

-- 3. Copy existing class_limit values to classes_per_period for consistency
UPDATE membership_plans 
SET classes_per_period = class_limit 
WHERE classes_per_period IS NULL AND class_limit IS NOT NULL;

-- 4. Create a trigger to keep both columns in sync for backward compatibility
CREATE OR REPLACE FUNCTION sync_membership_plan_class_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If classes_per_period is updated, sync to class_limit
  IF NEW.classes_per_period IS DISTINCT FROM OLD.classes_per_period THEN
    NEW.class_limit = NEW.classes_per_period;
  -- If class_limit is updated, sync to classes_per_period
  ELSIF NEW.class_limit IS DISTINCT FROM OLD.class_limit THEN
    NEW.classes_per_period = NEW.class_limit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_membership_plan_class_columns_trigger ON membership_plans;
CREATE TRIGGER sync_membership_plan_class_columns_trigger
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION sync_membership_plan_class_columns();

-- 5. Create index for performance on new column
CREATE INDEX IF NOT EXISTS idx_customer_memberships_classes_used 
ON customer_memberships(classes_used_this_period);

-- 6. Add comment for documentation
COMMENT ON COLUMN customer_memberships.classes_used_this_period IS 'Number of classes used in the current billing period for membership tracking';
COMMENT ON COLUMN membership_plans.classes_per_period IS 'Number of classes allowed per billing period (synced with class_limit for compatibility)';