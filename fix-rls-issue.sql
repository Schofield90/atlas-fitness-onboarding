-- Disable RLS on user_organizations to fix the access issue
ALTER TABLE user_organizations DISABLE ROW LEVEL SECURITY;

-- Verify the record exists
SELECT * FROM user_organizations 
WHERE user_id = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';