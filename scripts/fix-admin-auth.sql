-- Fix Admin Authentication Issues
-- Run this in Supabase SQL Editor

-- 1. Check if any @gymleadhub.co.uk users exist
SELECT
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
WHERE email LIKE '%@gymleadhub.co.uk';

-- 2. Check super_admin_users table
SELECT
  sau.*,
  u.email
FROM super_admin_users sau
LEFT JOIN auth.users u ON u.id = sau.user_id
WHERE sau.is_active = true;

-- 3. Create a test admin user if none exist
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@gymleadhub.co.uk'; -- Change this to your email
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    -- Note: You can't directly insert into auth.users from SQL
    -- You need to create the user via Supabase Dashboard or use the script
    RAISE NOTICE 'User % does not exist. Please create via:';
    RAISE NOTICE '1. Supabase Dashboard > Authentication > Users > Invite User';
    RAISE NOTICE '2. Or run: node scripts/reset-admin-password.js % YourPassword123';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE 'User % exists with ID: %', v_email, v_user_id;

    -- Ensure user is in super_admin_users
    INSERT INTO super_admin_users (
      user_id,
      role,
      is_active,
      permissions
    ) VALUES (
      v_user_id,
      'platform_owner'::admin_role,
      true,
      '["all"]'::jsonb
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      role = 'platform_owner'::admin_role,
      is_active = true,
      permissions = '["all"]'::jsonb,
      updated_at = NOW();

    RAISE NOTICE 'User added to super_admin_users as platform_owner';
  END IF;
END $$;

-- 4. Verify the setup
SELECT
  'Current Admin Users:' as info,
  COUNT(*) as total_admins
FROM super_admin_users
WHERE is_active = true;

-- 5. Check if profiles table needs updating
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Update profiles for admin users
    UPDATE profiles
    SET role = 'admin'
    WHERE email LIKE '%@gymleadhub.co.uk';

    RAISE NOTICE 'Updated profiles table for admin users';
  END IF;
END $$;