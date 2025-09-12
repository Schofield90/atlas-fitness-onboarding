-- Fixed version of get_all_conversations function
DROP FUNCTION IF EXISTS public.get_all_conversations(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_all_conversations(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  conv_id UUID,
  contact_id UUID,
  contact_type TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count INTEGER,
  sender_type TEXT,
  sender_name TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH all_conversations AS (
    -- Get conversations with clients
    SELECT DISTINCT
      c.id as conversation_id,
      c.client_id as contact_uid,
      'client'::TEXT as contact_kind,
      cl.name as contact_display_name,
      cl.email as contact_email_addr,
      cl.phone as contact_phone_num,
      c.last_message_at
    FROM conversations c
    INNER JOIN clients cl ON cl.id = c.client_id
    WHERE c.organization_id = p_organization_id
      AND c.status = 'active'
      AND c.client_id IS NOT NULL
    
    UNION ALL
    
    -- Get conversations from messages table for clients without conversation records
    SELECT DISTINCT
      m.conversation_id as conversation_id,
      m.client_id as contact_uid,
      'client'::TEXT as contact_kind,
      cl.name as contact_display_name,
      cl.email as contact_email_addr,
      cl.phone as contact_phone_num,
      MAX(m.created_at) as last_message_at
    FROM messages m
    INNER JOIN clients cl ON cl.id = m.client_id
    WHERE m.organization_id = p_organization_id
      AND m.client_id IS NOT NULL
      AND m.conversation_id IS NOT NULL
    GROUP BY m.conversation_id, m.client_id, cl.name, cl.email, cl.phone
  ),
  latest_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id as msg_conversation_id,
      m.body as msg_content,
      m.content as msg_alt_content,
      m.created_at as msg_created_at,
      m.sender_type as msg_sender_type,
      m.sender_name as msg_sender_name,
      m.status as msg_status,
      m.direction as msg_direction
    FROM messages m
    WHERE m.organization_id = p_organization_id
      AND m.conversation_id IS NOT NULL
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m2.conversation_id as unread_conversation_id,
      COUNT(*) as unread_msg_count
    FROM messages m2
    WHERE m2.organization_id = p_organization_id
      AND m2.direction = 'inbound'
      AND (m2.status != 'read' OR m2.status IS NULL)
      AND m2.conversation_id IS NOT NULL
    GROUP BY m2.conversation_id
  )
  SELECT 
    ac.conversation_id,
    ac.contact_uid,
    ac.contact_kind,
    COALESCE(ac.contact_display_name, 'Unknown'),
    COALESCE(ac.contact_email_addr, ''),
    COALESCE(ac.contact_phone_num, ''),
    COALESCE(lm.msg_content, lm.msg_alt_content, ''),
    COALESCE(lm.msg_created_at, ac.last_message_at),
    COALESCE(uc.unread_msg_count, 0)::INTEGER,
    COALESCE(lm.msg_sender_type, 'client'),
    COALESCE(lm.msg_sender_name, ac.contact_display_name, ''),
    COALESCE(lm.msg_status, 'active')
  FROM all_conversations ac
  LEFT JOIN latest_messages lm ON lm.msg_conversation_id = ac.conversation_id
  LEFT JOIN unread_counts uc ON uc.unread_conversation_id = ac.conversation_id
  WHERE ac.conversation_id IS NOT NULL
  ORDER BY COALESCE(lm.msg_created_at, ac.last_message_at) DESC NULLS LAST;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_conversations TO authenticated;

-- Now run the debug checks
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
  COALESCE(body, content) as message_text,
  status,
  created_at
FROM messages
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Test the fixed function
SELECT * FROM public.get_all_conversations(
  (SELECT id FROM users WHERE email = 'sam@atlas-gyms.co.uk' LIMIT 1),
  (SELECT id FROM organizations LIMIT 1)
);