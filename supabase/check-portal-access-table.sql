SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_portal_access'
ORDER BY ordinal_position;