-- Fix user profile issue
-- This ensures the user exists in the users table with the correct organization_id

-- First, check if the user exists
SELECT 
  id, 
  email, 
  organization_id,
  created_at
FROM auth.users 
WHERE id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';

-- Insert the user into the public.users table if they don't exist
INSERT INTO public.users (
  id, 
  email, 
  organization_id,
  role,
  created_at,
  updated_at
)
SELECT 
  'ea1fc8e3-35a2-4c59-80af-5fde557391a1',
  au.email,
  '63589490-8f55-4157-bd3a-e141594b748e', -- The organization_id from your migration job
  'owner',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  updated_at = NOW();

-- Verify the user now exists
SELECT * FROM public.users WHERE id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';

-- Check if the migration job exists
SELECT 
  id,
  organization_id,
  status,
  source_system,
  created_at
FROM migration_jobs 
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC;