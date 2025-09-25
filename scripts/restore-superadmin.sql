-- Restore superadmin user: sam@gymleadhub.co.uk
-- This script creates or updates the superadmin user with the correct credentials

-- First, check if user exists and delete if present
DO $$
DECLARE
  user_id_var uuid;
BEGIN
  -- Find user by email
  SELECT id INTO user_id_var FROM auth.users WHERE email = 'sam@gymleadhub.co.uk';
  
  IF user_id_var IS NOT NULL THEN
    -- Delete from staff table first (foreign key dependency)
    DELETE FROM staff WHERE user_id = user_id_var;
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = user_id_var;
    
    RAISE NOTICE 'Deleted existing user: %', user_id_var;
  END IF;
END $$;

-- Create the superadmin user in auth.users
-- Password: @Aa80236661
-- The encrypted password below is bcrypt hash of @Aa80236661
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'sam@gymleadhub.co.uk',
  crypt('@Aa80236661', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
RETURNING id;

-- Store the user ID for the staff record
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Get the newly created user ID
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'sam@gymleadhub.co.uk';
  
  -- Create staff record with superadmin role
  INSERT INTO staff (
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    'sam@gymleadhub.co.uk',
    'Sam',
    'Schofield',
    'superadmin',
    true,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Created superadmin user with ID: %', new_user_id;
END $$;

-- Verify the setup
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  s.role,
  s.is_active
FROM auth.users u
LEFT JOIN staff s ON s.user_id = u.id
WHERE u.email = 'sam@gymleadhub.co.uk';