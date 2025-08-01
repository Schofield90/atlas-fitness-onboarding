-- Fix user organization link for Atlas Fitness
-- This will create the user_organizations entry to link your user to Atlas Fitness

-- First, let's check if you already have a user_organizations entry
SELECT * FROM user_organizations 
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- Get your user ID (replace with your actual email)
-- You can find this by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Once you have your user ID, run this to create the link:
-- Replace 'YOUR-USER-ID-HERE' with your actual user ID from the query above
INSERT INTO user_organizations (user_id, organization_id, role, is_active)
VALUES (
  'YOUR-USER-ID-HERE'::uuid,  -- Replace this with your user ID
  '63589490-8f55-4157-bd3a-e141594b748e'::uuid,  -- Atlas Fitness organization ID
  'owner',  -- Role as owner
  true      -- Active status
)
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET 
  role = 'owner',
  is_active = true,
  updated_at = NOW();

-- Verify the link was created
SELECT 
  uo.*,
  u.email,
  o.name as organization_name
FROM user_organizations uo
JOIN auth.users u ON u.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.organization_id = '63589490-8f55-4157-bd3a-e141594b748e';