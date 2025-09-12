-- 1. First update client names where they are NULL
UPDATE clients 
SET name = COALESCE(
  name,
  CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')),
  email,
  'Client'
)
WHERE name IS NULL OR name = '';

-- 2. Fix the duplicate issue in the function and handle names better
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
    -- Get unique conversations
    SELECT DISTINCT ON (COALESCE(c.id, m.conversation_id))
      COALESCE(c.id, m.conversation_id) as conversation_id,
      COALESCE(c.client_id, m.client_id) as contact_uid,
      'client'::TEXT as contact_kind,
      CAST(COALESCE(
        cl.name,
        CONCAT(COALESCE(cl.first_name, ''), ' ', COALESCE(cl.last_name, '')),
        cl.email,
        'Client'
      ) AS TEXT) as contact_display_name,
      CAST(COALESCE(cl.email, '') AS TEXT) as contact_email_addr,
      CAST(COALESCE(cl.phone, '') AS TEXT) as contact_phone_num,
      GREATEST(c.last_message_at, MAX(m.created_at)) as last_message_at
    FROM clients cl
    LEFT JOIN conversations c ON c.client_id = cl.id AND c.organization_id = p_organization_id
    LEFT JOIN messages m ON m.client_id = cl.id AND m.organization_id = p_organization_id
    WHERE cl.organization_id = p_organization_id
      AND (c.id IS NOT NULL OR m.conversation_id IS NOT NULL)
    GROUP BY c.id, m.conversation_id, c.client_id, m.client_id, cl.id, cl.name, cl.first_name, cl.last_name, cl.email, cl.phone, c.last_message_at
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
    ac.contact_display_name,
    ac.contact_email_addr,
    ac.contact_phone_num,
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

-- Test the updated function
SELECT * FROM public.get_all_conversations(
  (SELECT id FROM users WHERE email = 'sam@atlas-gyms.co.uk' LIMIT 1),
  (SELECT id FROM organizations LIMIT 1)
);

-- Also check what the client names look like now
SELECT id, name, first_name, last_name, email 
FROM clients 
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
LIMIT 5;