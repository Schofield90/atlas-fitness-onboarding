-- Fix for Sam's user issue - Run this in Supabase SQL Editor

-- First, check if the user already exists
SELECT * FROM users WHERE id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';

-- If no rows returned from above, run this insert:
INSERT INTO users (
  id,
  email,
  name,
  organization_id,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'ea1fc8e3-35a2-4c59-80af-5fde557391a1',
  'sam@atlas-gyms.co.uk',
  'Sam Schofield',
  '63589490-8f55-4157-bd3a-e141594b748e',
  'owner',
  true,
  NOW(),
  NOW()
);

-- Verify the fix worked
SELECT 
  u.*, 
  o.name as organization_name 
FROM users u 
JOIN organizations o ON u.organization_id = o.id 
WHERE u.id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';

-- Test that you can now query leads with the proper organization context
SELECT * FROM leads WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e' LIMIT 5;