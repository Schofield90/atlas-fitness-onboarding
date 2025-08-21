-- Check if RLS is enabled on user_organizations
SELECT 
    tablename,
    rowsecurity 
FROM 
    pg_tables 
WHERE 
    tablename = 'user_organizations';

-- Check existing RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename = 'user_organizations';

-- Disable RLS temporarily to check if that's the issue
ALTER TABLE user_organizations DISABLE ROW LEVEL SECURITY;

-- Or create a proper RLS policy that allows users to see their own records
CREATE POLICY "Users can view their own organizations" 
ON user_organizations
FOR SELECT
USING (user_id = auth.uid());

-- Also allow users to insert their own records
CREATE POLICY "Users can insert their own organizations" 
ON user_organizations
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Check if the record exists without RLS
SELECT * FROM user_organizations 
WHERE user_id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';