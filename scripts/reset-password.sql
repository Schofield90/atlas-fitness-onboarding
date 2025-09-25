-- Reset password for sam@gymleadhub.co.uk
-- Note: You cannot directly update passwords in auth.users via SQL
-- You must use one of these methods:

-- METHOD 1: Via Supabase Dashboard (Recommended)
-- 1. Go to Supabase Dashboard
-- 2. Authentication > Users
-- 3. Find sam@gymleadhub.co.uk
-- 4. Click the three dots menu
-- 5. Select "Send password recovery"
-- 6. Check your email for the reset link

-- METHOD 2: Create a password reset link
-- Run this to generate a magic link for password reset:
SELECT
  'To reset password for sam@gymleadhub.co.uk:' as instruction,
  '1. Go to Supabase Dashboard > Authentication > Users' as step1,
  '2. Find the user and click "Send password recovery"' as step2,
  '3. Or use the Supabase Management API with your service key' as step3;

-- Verify user is set up correctly
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.last_sign_in_at,
  sau.role,
  sau.is_active,
  sau.permissions
FROM auth.users u
JOIN super_admin_users sau ON sau.user_id = u.id
WHERE u.email = 'sam@gymleadhub.co.uk';

-- If you see the user above, they are set up correctly.
-- The password just needs to be reset via Supabase Dashboard.