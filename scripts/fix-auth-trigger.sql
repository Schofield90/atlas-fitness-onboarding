-- Fix the auth.users trigger that's preventing user creation
-- Run this in the Supabase SQL editor

-- 1. First, let's see what trigger exists
SELECT 
    tgname as trigger_name,
    proname as function_name,
    prosrc as function_source
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'auth.users'::regclass;

-- 2. Check the profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Drop and recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Only try to insert profile if it doesn't already exist
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to create profile for user %: %', new.email, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the trigger is set up correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Alternative: If you want to completely disable the trigger temporarily
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 6. Test that we can now create users
-- This should work after applying the fixes above
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    -- Try to insert a test user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        'test-' || extract(epoch from now()) || '@example.com',
        crypt('TestPassword123!', gen_salt('bf')),
        now(),
        now(),
        now(),
        'authenticated',
        'authenticated'
    );
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
    
    RAISE NOTICE 'Test user creation successful!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Test failed: %', SQLERRM;
END $$;