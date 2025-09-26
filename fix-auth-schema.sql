-- Fix Supabase Auth Schema Issues
-- Run this in Supabase SQL Editor as a service role user

-- 1. Check if auth schema exists and has proper permissions
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'auth';

-- 2. Check if auth.users table exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    RAISE NOTICE 'auth.users table exists';

    -- Check user count
    EXECUTE format('SELECT COUNT(*) FROM auth.users') INTO STRICT temp_count;
    RAISE NOTICE 'auth.users has % users', temp_count;

    -- Check specific user
    PERFORM 1 FROM auth.users WHERE email = 'sam@gymleadhub.co.uk';
    IF FOUND THEN
      RAISE NOTICE 'sam@gymleadhub.co.uk exists in auth.users';
    ELSE
      RAISE NOTICE 'sam@gymleadhub.co.uk NOT FOUND in auth.users';
    END IF;
  ELSE
    RAISE NOTICE 'auth.users table DOES NOT EXIST - This is the problem!';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error checking auth.users: %', SQLERRM;
END
$$;

-- 3. If user doesn't exist in auth.users, create them manually
DO $$
DECLARE
  v_user_id UUID;
  v_password_hash TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Generate UUID for user
  v_user_id := gen_random_uuid();

  -- Generate password hash (simplified - in production, use proper bcrypt)
  -- This is a temporary hash - you'll need to reset the password properly
  v_password_hash := crypt('@Aa80236661', gen_salt('bf', 10));

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sam@gymleadhub.co.uk') THEN
    RAISE NOTICE 'Creating user sam@gymleadhub.co.uk in auth.users...';

    -- Insert into auth.users (this might fail if auth schema is corrupted)
    BEGIN
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        email_change_token_new,
        recovery_token
      ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated',
        'authenticated',
        'sam@gymleadhub.co.uk',
        v_password_hash,
        v_now,
        v_now,
        v_now,
        '',
        '',
        ''
      );

      RAISE NOTICE 'User created successfully with ID: %', v_user_id;

      -- Also insert into auth.identities
      INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        created_at,
        updated_at
      ) VALUES (
        'sam@gymleadhub.co.uk',
        v_user_id,
        format('{"sub": "%s", "email": "%s"}', v_user_id, 'sam@gymleadhub.co.uk')::jsonb,
        'email',
        v_now,
        v_now
      );

      RAISE NOTICE 'Identity created successfully';

      -- Update super_admin_users to use the correct user_id
      UPDATE super_admin_users
      SET user_id = v_user_id,
          email = 'sam@gymleadhub.co.uk'
      WHERE email = 'sam@gymleadhub.co.uk' OR user_id IS NULL;

      RAISE NOTICE 'Updated super_admin_users with correct user_id';

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create user in auth.users: %', SQLERRM;
        RAISE NOTICE 'This confirms the auth schema is corrupted or missing permissions';
    END;
  ELSE
    RAISE NOTICE 'User sam@gymleadhub.co.uk already exists in auth.users';
  END IF;
END
$$;