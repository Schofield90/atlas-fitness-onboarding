-- Find and delete duplicate clients, keeping only the first one created
WITH duplicates AS (
  SELECT 
    email,
    array_agg(id ORDER BY created_at) as client_ids,
    COUNT(*) as count
  FROM clients
  WHERE org_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  GROUP BY email
  HAVING COUNT(*) > 1
)
SELECT 
  email,
  count,
  client_ids[1] as keeping_id,
  client_ids[2:] as deleting_ids
FROM duplicates
ORDER BY count DESC
LIMIT 20;

-- To actually delete duplicates (RUN THIS AFTER REVIEWING ABOVE):
-- DELETE FROM clients 
-- WHERE id IN (
--   SELECT unnest(client_ids[2:]) 
--   FROM (
--     SELECT email, array_agg(id ORDER BY created_at) as client_ids
--     FROM clients
--     WHERE org_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
--     GROUP BY email
--     HAVING COUNT(*) > 1
--   ) dups
-- );
