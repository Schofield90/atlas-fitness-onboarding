-- Update password for sam@atlas-gyms.co.uk
-- The password will be hashed by Supabase auth system
UPDATE auth.users 
SET encrypted_password = crypt('@Aa80236661', gen_salt('bf'))
WHERE email = 'sam@atlas-gyms.co.uk';

-- Verify the update
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
WHERE email = 'sam@atlas-gyms.co.uk';