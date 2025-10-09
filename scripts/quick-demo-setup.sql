-- Quick Demo Data Setup
-- Organization ID: c762845b-34fc-41ea-9e01-f70b81c44ff7

-- 1. CREATE MEMBERSHIP PLANS
INSERT INTO membership_plans (
  organization_id, name, description, price, billing_period, category, payment_provider, is_active
) VALUES
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Trial Pass', '1-week trial membership', 20, 'one_time', 'trial', 'stripe', true),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Basic Monthly', '4 classes per month', 49, 'monthly', 'basic', 'stripe', true),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Premium Monthly', '12 classes per month', 89, 'monthly', 'premium', 'stripe', true),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Elite Unlimited', 'Unlimited classes', 129, 'monthly', 'elite', 'stripe', true),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'VIP Annual', 'Unlimited classes + PT sessions', 1200, 'yearly', 'vip', 'stripe', true)
ON CONFLICT DO NOTHING;

SELECT '✅ Created ' || COUNT(*) || ' membership plans' FROM membership_plans WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

-- 2. CREATE CLASS TYPES
INSERT INTO class_types (
  organization_id, name, description, duration_minutes, default_capacity
) VALUES
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Yoga Flow', 'Vinyasa-style flowing yoga', 60, 20),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'HIIT Training', 'High-intensity interval training', 45, 15),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Strength & Conditioning', 'Weight training and conditioning', 60, 12),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Spin Class', 'Indoor cycling workout', 45, 20),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Boxing Fundamentals', 'Boxing techniques and cardio', 60, 15),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Pilates Core', 'Core-focused Pilates', 50, 18),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'CrossFit WOD', 'Workout of the day', 60, 12),
  ('c762845b-34fc-41ea-9e01-f70b81c44ff7', 'Zumba Dance', 'Dance fitness party', 45, 25)
ON CONFLICT DO NOTHING;

SELECT '✅ Created ' || COUNT(*) || ' class types' FROM class_types WHERE organization_id = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';
