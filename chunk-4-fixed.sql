-- Chunk 4: Functions and Views (Fixed)
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_organizations
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP VIEW IF EXISTS user_accessible_organizations;
CREATE VIEW user_accessible_organizations AS
SELECT 
  o.id,
  o.name,
  o.plan,
  o.status,
  o.settings,
  o.created_at,
  o.updated_at,
  uo.role as user_role,
  uo.user_id
FROM organizations o
INNER JOIN user_organizations uo ON o.id = uo.organization_id
WHERE uo.is_active = true;

GRANT SELECT ON user_accessible_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;