-- Ensure user_organizations table is properly set up for the current user
-- This fixes the authentication issue where users can't access their organization data

-- Add sam@atlas-gyms.co.uk to user_organizations if not already there
INSERT INTO user_organizations (user_id, organization_id, is_active)
SELECT 
    u.id as user_id,
    '63589490-8f55-4157-bd3a-e141594b748e' as organization_id,
    true as is_active
FROM users u
WHERE u.email = 'sam@atlas-gyms.co.uk'
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET is_active = true;

-- Also ensure they're in organization_members
INSERT INTO organization_members (user_id, organization_id, role, is_active)
SELECT 
    u.id as user_id,
    '63589490-8f55-4157-bd3a-e141594b748e' as organization_id,
    'owner' as role,
    true as is_active
FROM users u
WHERE u.email = 'sam@atlas-gyms.co.uk'
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET 
    is_active = true,
    role = 'owner';

-- Verify the setup
SELECT 
    'user_organizations' as table_name,
    COUNT(*) as record_count
FROM user_organizations
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
UNION ALL
SELECT 
    'organization_members' as table_name,
    COUNT(*) as record_count
FROM organization_members
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';