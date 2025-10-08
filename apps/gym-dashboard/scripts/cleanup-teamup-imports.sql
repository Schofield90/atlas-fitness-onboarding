-- Cleanup TeamUp imports for fresh re-import
-- Organization ID: ee1206d7-62fb-49cf-9f39-95b9c54423a4

-- 1. Delete class_sessions created from TeamUp imports
DELETE FROM class_sessions
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND description = 'Imported from TeamUp schedule';

-- 2. Delete class_schedules from TeamUp imports
DELETE FROM class_schedules cs
USING class_types ct
WHERE cs.class_type_id = ct.id
  AND ct.organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND (cs.instructor_name IS NOT NULL OR cs.room_location IS NOT NULL);

-- 3. Delete programs created from TeamUp imports
DELETE FROM programs
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND metadata->>'source' = 'teamup_pdf_import';

-- 4. Delete class_types created from TeamUp imports
DELETE FROM class_types
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND description = 'Imported from TeamUp schedule';

-- Verify cleanup
SELECT
  'After Cleanup - Schedules' as check_type,
  COUNT(*) as remaining
FROM class_schedules cs
JOIN class_types ct ON cs.class_type_id = ct.id
WHERE ct.organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'

UNION ALL

SELECT
  'After Cleanup - Sessions',
  COUNT(*)
FROM class_sessions
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND description = 'Imported from TeamUp schedule'

UNION ALL

SELECT
  'After Cleanup - Programs',
  COUNT(*)
FROM programs
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND metadata->>'source' = 'teamup_pdf_import'

UNION ALL

SELECT
  'After Cleanup - Class Types',
  COUNT(*)
FROM class_types
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND description = 'Imported from TeamUp schedule';
