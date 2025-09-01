-- Update the test booking link to use the authenticated user
-- This will enable Google Calendar integration for the booking link

-- First, let's see what we have
SELECT 
    bl.id,
    bl.slug,
    bl.name,
    bl.user_id,
    bl.organization_id,
    u.email as user_email
FROM booking_links bl
LEFT JOIN auth.users u ON u.id = bl.user_id
WHERE bl.slug = 'test';

-- Update the test booking link to use Sam's user ID and Atlas Fitness org
UPDATE booking_links 
SET 
    user_id = (SELECT id FROM auth.users WHERE email = 'sam@atlas-gyms.co.uk' LIMIT 1),
    organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
WHERE slug = 'test';

-- Verify the update
SELECT 
    bl.id,
    bl.slug,
    bl.name,
    bl.user_id,
    bl.organization_id,
    u.email as user_email,
    gct.access_token IS NOT NULL as has_google_token,
    gct.sync_enabled as google_sync_enabled
FROM booking_links bl
LEFT JOIN auth.users u ON u.id = bl.user_id
LEFT JOIN google_calendar_tokens gct ON gct.user_id = bl.user_id
WHERE bl.slug = 'test';