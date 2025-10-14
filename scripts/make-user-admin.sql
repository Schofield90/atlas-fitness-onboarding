-- Make test2@test.co.uk a superadmin
-- Run this in Supabase SQL Editor

-- First, check if user exists in staff table
SELECT * FROM staff WHERE user_id = 'a625a432-d577-478e-b987-16734faff30f';

-- If not exists, insert into staff table
-- Note: staff table schema uses org_id and user_id, NOT email or name
INSERT INTO staff (
  org_id,
  user_id,
  metadata
)
VALUES (
  'c762845b-34fc-41ea-9e01-f70b81c44ff7', -- Demo Fitness Studio
  'a625a432-d577-478e-b987-16734faff30f',
  jsonb_build_object(
    'role', 'superadmin',
    'is_active', true
  )
)
ON CONFLICT (user_id) DO UPDATE
SET
  metadata = jsonb_build_object(
    'role', 'superadmin',
    'is_active', true
  ),
  updated_at = NOW();

-- Verify the change
SELECT id, user_id, org_id, metadata->>'role' as role, metadata->>'is_active' as is_active
FROM staff
WHERE user_id = 'a625a432-d577-478e-b987-16734faff30f';
