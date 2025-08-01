-- Check what tags Sam actually has
SELECT 
  l.id as lead_id,
  l.name as lead_name,
  t.name as tag_name,
  t.color as tag_color,
  lt.created_at
FROM leads l
JOIN lead_tags lt ON lt.lead_id = l.id
JOIN tags t ON t.id = lt.tag_id
WHERE l.name = 'Sam Schofield'
ORDER BY lt.created_at;

-- Check if there are multiple tag entries
SELECT 
  lead_id,
  COUNT(*) as tag_count,
  STRING_AGG(t.name, ', ') as tags
FROM lead_tags lt
JOIN tags t ON t.id = lt.tag_id
WHERE t.name IN ('Lead', 'Customer', 'Ex Member')
GROUP BY lead_id
HAVING COUNT(*) > 1;

-- Force cleanup for Sam specifically
DELETE FROM lead_tags 
WHERE lead_id = (SELECT id FROM leads WHERE name = 'Sam Schofield')
AND tag_id IN (
  SELECT id FROM tags 
  WHERE name IN ('Lead', 'Customer', 'Ex Member')
);

-- Add only the Customer tag for Sam
INSERT INTO lead_tags (organization_id, lead_id, tag_id)
SELECT 
  l.organization_id,
  l.id,
  t.id
FROM leads l
CROSS JOIN tags t
WHERE l.name = 'Sam Schofield'
AND t.name = 'Customer'
AND t.organization_id = l.organization_id;