-- Final verification of test2@test.co.uk organization links
-- Run this in Supabase SQL Editor

SELECT
  'user_organizations' as table_name,
  uo.organization_id,
  o.name as org_name,
  uo.role,
  uo.created_at
FROM user_organizations uo
LEFT JOIN organizations o ON o.id = uo.organization_id
WHERE uo.user_id = 'a625a432-d577-478e-b987-16734faff30f'
ORDER BY uo.created_at DESC;

-- Also check organization_staff
SELECT
  'organization_staff' as table_name,
  os.organization_id,
  o.name as org_name,
  os.role,
  os.created_at
FROM organization_staff os
LEFT JOIN organizations o ON o.id = os.organization_id
WHERE os.user_id = 'a625a432-d577-478e-b987-16734faff30f'
ORDER BY os.created_at DESC;

-- Check organization_members (should be empty)
SELECT
  'organization_members' as table_name,
  om.organization_id,
  o.name as org_name,
  om.created_at
FROM organization_members om
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'a625a432-d577-478e-b987-16734faff30f'
ORDER BY om.created_at DESC;
