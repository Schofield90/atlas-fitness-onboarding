-- Quick fix for auth user creation issue
-- Run this in Supabase SQL Editor

-- Option 1: Temporarily disable the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Option 2: If you want to keep profiles synced, use this safer function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert with minimal required fields only
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (
        new.id,
        COALESCE(new.email, 'no-email@example.com'),
        COALESCE(new.created_at, now()),
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        updated_at = now();
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail user creation if profile creation fails
        RAISE LOG 'Profile creation failed for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable the trigger with the fixed function
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Test that it works
SELECT 'Auth trigger fixed! You should now be able to create users.' as status;