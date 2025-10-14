-- Check if test2@test.co.uk has multiple organization entries
SELECT
  'user_organizations' as source,
  uo.organization_id,
  o.name as org_name,
  uo.role,
  uo.created_at
FROM user_organizations uo
LEFT JOIN organizations o ON o.id = uo.organization_id
WHERE uo.user_id = 'a625a432-d577-478e-b987-16734faff30f'
ORDER BY uo.created_at DESC;
