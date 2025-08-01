-- Delete mock class sessions that were created for testing
-- These are identified by having generic names and descriptions

-- First, let's see what we're about to delete
SELECT COUNT(*) as total_mock_classes,
       name,
       description
FROM class_sessions
WHERE (
  name LIKE '%Yoga%' OR
  name LIKE '%HIIT%' OR
  name LIKE '%CrossFit%' OR
  name LIKE '%Spin%' OR
  name LIKE '%Pilates%' OR
  name LIKE '%Boxing%' OR
  name LIKE '%Zumba%' OR
  name LIKE '%Strength Training%' OR
  name LIKE '%Circuit Training%' OR
  name LIKE '%Bootcamp%'
)
AND organization_id = '63589490-8f55-4157-bd3a-e141594b740e'
GROUP BY name, description
ORDER BY name;

-- Delete all the mock classes
-- IMPORTANT: Run this ONLY after confirming the above query shows the correct classes
DELETE FROM class_sessions
WHERE (
  name LIKE '%Yoga%' OR
  name LIKE '%HIIT%' OR
  name LIKE '%CrossFit%' OR
  name LIKE '%Spin%' OR
  name LIKE '%Pilates%' OR
  name LIKE '%Boxing%' OR
  name LIKE '%Zumba%' OR
  name LIKE '%Strength Training%' OR
  name LIKE '%Circuit Training%' OR
  name LIKE '%Bootcamp%'
)
AND organization_id = '63589490-8f55-4157-bd3a-e141594b740e';

-- Alternative: Delete ALL classes for your organization and start fresh
-- CAREFUL: This will delete ALL classes, not just mock ones
-- DELETE FROM class_sessions WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b740e';

-- Verify deletion
SELECT COUNT(*) as remaining_classes FROM class_sessions 
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b740e';