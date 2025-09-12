-- Create a function to get all conversations for the unified messaging view
CREATE OR REPLACE FUNCTION public.get_all_conversations(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  conversation_id UUID,
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
      c.id as conv_id,
      c.client_id as contact_id,
      'client'::TEXT as contact_type,
      cl.name as contact_name,
      cl.email as contact_email,
      cl.phone as contact_phone,
      c.last_message_at
    FROM conversations c
    INNER JOIN clients cl ON cl.id = c.client_id
    WHERE c.organization_id = p_organization_id
      AND c.status = 'active'
      AND c.client_id IS NOT NULL
    
    UNION ALL
    
    -- Get conversations from messages table for clients without conversation records
    SELECT DISTINCT
      m.conversation_id as conv_id,
      m.client_id as contact_id,
      'client'::TEXT as contact_type,
      cl.name as contact_name,
      cl.email as contact_email,
      cl.phone as contact_phone,
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
      m.conversation_id,
      m.body as content,
      m.content as alt_content,
      m.created_at,
      m.sender_type,
      m.sender_name,
      m.status,
      m.direction
    FROM messages m
    WHERE m.organization_id = p_organization_id
      AND m.conversation_id IS NOT NULL
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      conversation_id,
      COUNT(*) as unread_count
    FROM messages
    WHERE organization_id = p_organization_id
      AND direction = 'inbound'
      AND (status != 'read' OR status IS NULL)
      AND conversation_id IS NOT NULL
    GROUP BY conversation_id
  )
  SELECT 
    ac.conv_id as conversation_id,
    ac.contact_id,
    ac.contact_type,
    COALESCE(ac.contact_name, 'Unknown') as contact_name,
    COALESCE(ac.contact_email, '') as contact_email,
    COALESCE(ac.contact_phone, '') as contact_phone,
    COALESCE(lm.content, lm.alt_content, '') as last_message,
    COALESCE(lm.created_at, ac.last_message_at) as last_message_time,
    COALESCE(uc.unread_count, 0)::INTEGER as unread_count,
    COALESCE(lm.sender_type, 'client') as sender_type,
    COALESCE(lm.sender_name, ac.contact_name, '') as sender_name,
    COALESCE(lm.status, 'active') as status
  FROM all_conversations ac
  LEFT JOIN latest_messages lm ON lm.conversation_id = ac.conv_id
  LEFT JOIN unread_counts uc ON uc.conversation_id = ac.conv_id
  WHERE ac.conv_id IS NOT NULL
  ORDER BY COALESCE(lm.created_at, ac.last_message_at) DESC NULLS LAST;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_conversations TO authenticated;

-- Test the function
SELECT * FROM public.get_all_conversations(
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM organizations LIMIT 1)
);