-- Debug script to check what's happening with conversations

-- 1. Check if conversations table exists and has data
SELECT 
  'Conversations table' as check_type,
  COUNT(*) as count
FROM conversations;

-- 2. Check if messages have conversation_id
SELECT 
  'Messages with conversation_id' as check_type,
  COUNT(*) as count
FROM messages
WHERE conversation_id IS NOT NULL;

-- 3. Check if messages have client_id
SELECT 
  'Messages with client_id' as check_type,
  COUNT(*) as count
FROM messages
WHERE client_id IS NOT NULL;

-- 4. Check recent messages
SELECT 
  id,
  conversation_id,
  client_id,
  organization_id,
  sender_type,
  sender_name,
  body,
  content,
  status,
  created_at
FROM messages
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check if clients exist
SELECT 
  'Clients table' as check_type,
  COUNT(*) as count
FROM clients;

-- 6. Test the get_all_conversations function
-- Replace these with actual values from your system
SELECT * FROM public.get_all_conversations(
  (SELECT id FROM users WHERE email = 'sam@atlas-gyms.co.uk' LIMIT 1),
  (SELECT id FROM organizations LIMIT 1)
);

-- 7. Check for orphaned messages (messages without proper associations)
SELECT 
  'Orphaned messages (no conversation_id and no client_id)' as check_type,
  COUNT(*) as count
FROM messages
WHERE conversation_id IS NULL 
  AND client_id IS NULL
  AND organization_id IS NOT NULL;