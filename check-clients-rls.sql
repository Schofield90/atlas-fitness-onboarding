-- Check RLS policies on clients table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY policyname;

-- Check if RLS is enabled on clients table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'clients' AND schemaname = 'public';