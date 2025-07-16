-- Atlas Fitness Live Setup
-- Run this in your Supabase SQL editor

-- First, create your organization
INSERT INTO organizations (
  id,
  name,
  email,
  phone,
  address,
  city,
  country,
  timezone,
  subscription_plan,
  subscription_status,
  settings,
  created_at,
  updated_at
) VALUES (
  'atlas-fitness-001',
  'Atlas Fitness',
  'sam@atlasfitness.co.uk',
  '+44 1423 123456',
  'Your Gym Address, Harrogate',
  'Harrogate',
  'UK',
  'Europe/London',
  'pro',
  'active',
  jsonb_build_object(
    'trial_ends_at', null,
    'features', jsonb_build_array('sms', 'automation', 'analytics', 'integrations'),
    'limits', jsonb_build_object(
      'monthly_sms', 10000,
      'automations', 50,
      'integrations', 10
    )
  ),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  updated_at = NOW();

-- Create your admin user profile (you'll need to replace 'your-actual-user-id' with your Supabase Auth user ID)
-- To get your user ID: Go to Supabase Auth > Users and copy your user ID
INSERT INTO user_profiles (
  id,
  organization_id,
  email,
  full_name,
  role,
  phone,
  is_active,
  settings,
  created_at,
  updated_at
) VALUES (
  'your-actual-user-id', -- Replace with your actual Supabase Auth user ID
  'atlas-fitness-001',
  'sam@atlasfitness.co.uk',
  'Sam Schofield',
  'owner',
  '+44 7700 900123',
  true,
  jsonb_build_object(
    'notifications', true,
    'timezone', 'Europe/London',
    'email_alerts', true,
    'sms_alerts', true
  ),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  updated_at = NOW();

-- Set up your automation templates (these are the pre-built ones)
INSERT INTO automation_templates (
  id,
  name,
  description,
  template_key,
  category,
  default_config,
  expected_impact,
  setup_time_minutes,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  'template-pt-inquiry',
  'PT Lead Response',
  'Instant response for personal training inquiries',
  'lead_follow_up',
  'lead_management',
  jsonb_build_object(
    'sms_delay_minutes', 2,
    'sms_message', 'Hi {{first_name}}! Thanks for your interest in PT at Atlas Fitness. I''m Sam, the owner. When works best for a quick chat about your fitness goals? I have slots tomorrow at 10am or 2pm. - Sam',
    'email_delay_hours', 1,
    'email_subject', 'Your Personal Training Journey at Atlas Fitness',
    'task_delay_hours', 24,
    'task_message', 'Follow up with {{first_name}} about PT inquiry if no response'
  ),
  '3-5 more PT signups per month',
  5,
  true,
  NOW(),
  NOW()
),
(
  'template-trial-signup',
  'Free Trial Welcome',
  'Welcome message for free trial signups',
  'trial_conversion',
  'lead_management',
  jsonb_build_object(
    'sms_delay_minutes', 1,
    'sms_message', 'Hi {{first_name}}! 🎉 Your free trial at Atlas Fitness is confirmed! Quick question - are you more interested in weight training or classes? Just want to make sure your first session is perfect. - Sam',
    'email_delay_hours', 2,
    'email_subject', 'Welcome to Atlas Fitness - Your Free Trial Starts Now!',
    'task_delay_hours', 48,
    'task_message', 'Check in with {{first_name}} about their trial experience'
  ),
  '40% higher trial-to-member conversion',
  3,
  true,
  NOW(),
  NOW()
),
(
  'template-membership-inquiry',
  'Membership Inquiry Response',
  'Quick response for general membership questions',
  'lead_follow_up',
  'lead_management',
  jsonb_build_object(
    'sms_delay_minutes', 3,
    'sms_message', 'Hi {{first_name}}! Thanks for your interest in joining Atlas Fitness. I''d love to show you around and find the perfect membership for you. Are you free for a quick tour tomorrow? - Sam',
    'email_delay_hours', 1,
    'email_subject', 'Welcome to the Atlas Fitness Family!',
    'task_delay_hours', 24,
    'task_message', 'Schedule gym tour for {{first_name}}'
  ),
  '25% increase in membership conversions',
  4,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_config = EXCLUDED.default_config,
  updated_at = NOW();

-- Activate your automations
INSERT INTO gym_automations (
  id,
  organization_id,
  template_id,
  is_active,
  config,
  triggered_count,
  successful_count,
  created_at,
  updated_at
) VALUES 
(
  'atlas-pt-automation',
  'atlas-fitness-001',
  'template-pt-inquiry',
  true,
  jsonb_build_object(
    'sms_delay_minutes', 2,
    'sms_message', 'Hi {{first_name}}! Thanks for your interest in PT at Atlas Fitness. I''m Sam, the owner. When works best for a quick chat about your fitness goals? I have slots tomorrow at 10am or 2pm. - Sam',
    'email_delay_hours', 1,
    'email_subject', 'Your Personal Training Journey at Atlas Fitness',
    'task_delay_hours', 24,
    'task_message', 'Follow up with {{first_name}} about PT inquiry if no response',
    'assigned_user_id', 'your-actual-user-id'
  ),
  0,
  0,
  NOW(),
  NOW()
),
(
  'atlas-trial-automation',
  'atlas-fitness-001',
  'template-trial-signup',
  true,
  jsonb_build_object(
    'sms_delay_minutes', 1,
    'sms_message', 'Hi {{first_name}}! 🎉 Your free trial at Atlas Fitness is confirmed! Quick question - are you more interested in weight training or classes? Just want to make sure your first session is perfect. - Sam',
    'email_delay_hours', 2,
    'email_subject', 'Welcome to Atlas Fitness - Your Free Trial Starts Now!',
    'task_delay_hours', 48,
    'task_message', 'Check in with {{first_name}} about their trial experience',
    'assigned_user_id', 'your-actual-user-id'
  ),
  0,
  0,
  NOW(),
  NOW()
),
(
  'atlas-membership-automation',
  'atlas-fitness-001',
  'template-membership-inquiry',
  true,
  jsonb_build_object(
    'sms_delay_minutes', 3,
    'sms_message', 'Hi {{first_name}}! Thanks for your interest in joining Atlas Fitness. I''d love to show you around and find the perfect membership for you. Are you free for a quick tour tomorrow? - Sam',
    'email_delay_hours', 1,
    'email_subject', 'Welcome to the Atlas Fitness Family!',
    'task_delay_hours', 24,
    'task_message', 'Schedule gym tour for {{first_name}}',
    'assigned_user_id', 'your-actual-user-id'
  ),
  0,
  0,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  config = EXCLUDED.config,
  updated_at = NOW();

-- Create some sample membership plans for Atlas Fitness
INSERT INTO membership_plans (
  id,
  organization_id,
  name,
  description,
  price_monthly,
  price_annual,
  features,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  'atlas-off-peak',
  'atlas-fitness-001',
  'Off-Peak Membership',
  'Access Monday-Friday 9am-5pm, perfect for flexible schedules',
  29.99,
  299.99,
  jsonb_build_array('Gym access 9am-5pm weekdays', 'Free induction', 'Member app access', 'Locker included'),
  true,
  NOW(),
  NOW()
),
(
  'atlas-full-access',
  'atlas-fitness-001',
  'Full Access Membership',
  'Unlimited access to all facilities, classes, and equipment',
  49.99,
  499.99,
  jsonb_build_array('24/7 gym access', 'All group classes', 'Free induction', 'Member app access', 'Locker included', 'Guest passes'),
  true,
  NOW(),
  NOW()
),
(
  'atlas-premium-pt',
  'atlas-fitness-001',
  'Premium + PT',
  'Full membership plus personal training sessions',
  149.99,
  1499.99,
  jsonb_build_array('24/7 gym access', 'All group classes', '4 PT sessions per month', 'Nutrition guidance', 'Priority booking', 'Member app access', 'Locker included'),
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  features = EXCLUDED.features,
  updated_at = NOW();

-- Add some test leads to see the system in action
INSERT INTO leads (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  source,
  campaign,
  status,
  utm_source,
  utm_medium,
  utm_campaign,
  interests,
  notes,
  created_at,
  updated_at
) VALUES 
(
  'test-lead-001',
  'atlas-fitness-001',
  'Test',
  'Sarah',
  'test.sarah@example.com',
  '+44 7700 900456',
  'facebook',
  'New Year PT Special',
  'new',
  'facebook',
  'social',
  'new-year-pt',
  jsonb_build_array('personal training', 'weight loss', 'strength training'),
  'Interested in 1-on-1 personal training. Mentioned wanting to lose weight for summer.',
  NOW(),
  NOW()
),
(
  'test-lead-002',
  'atlas-fitness-001',
  'Test',
  'Mike',
  'test.mike@example.com',
  '+44 7700 900789',
  'instagram',
  'Free Week Pass',
  'new',
  'instagram',
  'social',
  'free-week-trial',
  jsonb_build_array('group classes', 'bootcamp', 'hiit'),
  'Wants to try group classes. Particularly interested in bootcamp and HIIT.',
  NOW(),
  NOW()
),
(
  'test-lead-003',
  'atlas-fitness-001',
  'Test',
  'Emma',
  'test.emma@example.com',
  '+44 7700 900234',
  'website',
  'Membership Inquiry',
  'new',
  'google',
  'organic',
  'membership-general',
  jsonb_build_array('membership', 'off-peak', 'flexible'),
  'Looking for flexible membership options. Interested in off-peak times.',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Success message
SELECT 
  'Atlas Fitness setup complete! ✅' as message,
  'Next steps:' as instructions,
  '1. Update your user ID in the user_profiles table' as step_1,
  '2. Add your environment variables to .env.local' as step_2,
  '3. Test SMS to your phone' as step_3,
  '4. Set up Facebook webhook' as step_4,
  '5. Run your first real ad!' as step_5;