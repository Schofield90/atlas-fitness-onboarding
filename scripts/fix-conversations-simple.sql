-- Simpler version that avoids type conflicts
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
      CAST(cl.name AS TEXT) as contact_display_name,
      CAST(cl.email AS TEXT) as contact_email_addr,
      CAST(COALESCE(cl.phone, '') AS TEXT) as contact_phone_num,
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
      CAST(cl.name AS TEXT) as contact_display_name,
      CAST(cl.email AS TEXT) as contact_email_addr,
      CAST(COALESCE(cl.phone, '') AS TEXT) as contact_phone_num,
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
      CAST(COALESCE(m.body, m.content, '') AS TEXT) as msg_content,
      m.created_at as msg_created_at,
      CAST(COALESCE(m.sender_type, '') AS TEXT) as msg_sender_type,
      CAST(COALESCE(m.sender_name, '') AS TEXT) as msg_sender_name,
      CAST(COALESCE(m.status, '') AS TEXT) as msg_status
    FROM messages m
    WHERE m.organization_id = p_organization_id
      AND m.conversation_id IS NOT NULL
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m2.conversation_id as unread_conversation_id,
      COUNT(*)::INTEGER as unread_msg_count
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
    CAST(COALESCE(ac.contact_display_name, 'Unknown') AS TEXT),
    CAST(COALESCE(ac.contact_email_addr, '') AS TEXT),
    CAST(COALESCE(ac.contact_phone_num, '') AS TEXT),
    CAST(COALESCE(lm.msg_content, '') AS TEXT),
    COALESCE(lm.msg_created_at, ac.last_message_at),
    COALESCE(uc.unread_msg_count, 0),
    CAST(COALESCE(lm.msg_sender_type, 'client') AS TEXT),
    CAST(COALESCE(lm.msg_sender_name, ac.contact_display_name, '') AS TEXT),
    CAST(COALESCE(lm.msg_status, 'active') AS TEXT)
  FROM all_conversations ac
  LEFT JOIN latest_messages lm ON lm.msg_conversation_id = ac.conversation_id
  LEFT JOIN unread_counts uc ON uc.unread_conversation_id = ac.conversation_id
  WHERE ac.conversation_id IS NOT NULL
  ORDER BY COALESCE(lm.msg_created_at, ac.last_message_at) DESC NULLS LAST;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_conversations TO authenticated;

-- Debug: Check what we have
-- 1. Count conversations
SELECT COUNT(*) as conversation_count FROM conversations;

-- 2. Count messages with conversation_id
SELECT COUNT(*) as messages_with_conv_id FROM messages WHERE conversation_id IS NOT NULL;

-- 3. Count messages with client_id  
SELECT COUNT(*) as messages_with_client_id FROM messages WHERE client_id IS NOT NULL;

-- 4. Check if there are any clients
SELECT COUNT(*) as client_count FROM clients;

-- 5. Check a sample of recent messages
SELECT 
  m.id,
  m.conversation_id,
  m.client_id,
  c.name as client_name,
  m.sender_type,
  LEFT(COALESCE(m.body, m.content, ''), 50) as message_preview,
  m.created_at
FROM messages m
LEFT JOIN clients c ON c.id = m.client_id
WHERE m.created_at > NOW() - INTERVAL '24 hours'
ORDER BY m.created_at DESC
LIMIT 5;

-- 6. Test the function
SELECT * FROM public.get_all_conversations(
  (SELECT id FROM users WHERE email = 'sam@atlas-gyms.co.uk' LIMIT 1),
  (SELECT id FROM organizations LIMIT 1)
);