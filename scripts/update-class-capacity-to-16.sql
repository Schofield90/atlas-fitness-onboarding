-- Update class capacity to 16 as requested by user
-- This updates both programs and class_sessions

-- Update programs to have capacity of 16
UPDATE programs
SET
  max_participants = 16,
  default_capacity = 16,
  max_capacity = 16
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- Update existing class sessions to have capacity of 16
UPDATE class_sessions
SET
  max_capacity = 16,
  capacity = 16
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- Verify the updates
SELECT
  'Programs updated' as table_name,
  COUNT(*) as records_updated
FROM programs
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND max_capacity = 16

UNION ALL

SELECT
  'Class sessions updated' as table_name,
  COUNT(*) as records_updated
FROM class_sessions
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND max_capacity = 16;