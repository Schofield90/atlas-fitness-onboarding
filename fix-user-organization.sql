-- Fix missing user_organizations record for Sam
-- This will link the user to the organization

-- First, check if the record exists
SELECT * FROM user_organizations 
WHERE user_id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';

-- If not exists, insert it
INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'ea1fc8e3-35a2-4c59-80af-5fde557391a1',
  '63589490-8f55-4157-bd3a-e141594b748e',
  'owner',
  true,
  NOW(),
  NOW()
) ON CONFLICT (user_id, organization_id) 
DO UPDATE SET 
  is_active = true,
  role = 'owner',
  updated_at = NOW();

-- Verify it worked
SELECT * FROM user_organizations 
WHERE user_id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';
