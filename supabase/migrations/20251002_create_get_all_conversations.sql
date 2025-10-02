-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_all_conversations(UUID, UUID);
DROP FUNCTION IF EXISTS get_coach_conversations(UUID);

-- Create get_all_conversations RPC function to query messages table
CREATE OR REPLACE FUNCTION get_all_conversations(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  conv_id TEXT,
  contact_id UUID,
  contact_name TEXT,
  contact_email VARCHAR,
  contact_phone VARCHAR,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
  sender_type VARCHAR,
  contact_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (conv.client_id)
      conv.client_id as msg_contact_id,
      m.body as msg_body,
      m.created_at as msg_time,
      m.sender_type as msg_sender_type,
      'client'::TEXT as msg_contact_type
    FROM messages m
    JOIN conversations conv ON conv.id = m.conversation_id
    WHERE conv.organization_id = p_organization_id
      AND conv.client_id IS NOT NULL
    ORDER BY conv.client_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT
      conv.client_id as uc_contact_id,
      COUNT(*) as uc_count
    FROM messages m
    JOIN conversations conv ON conv.id = m.conversation_id
    WHERE conv.organization_id = p_organization_id
      AND conv.client_id IS NOT NULL
      AND m.sender_type IN ('client', 'member')
      AND m.status != 'read'
    GROUP BY conv.client_id
  )
  SELECT
    ('client-' || c.id::TEXT) as conv_id,
    c.id as contact_id,
    COALESCE(c.first_name || ' ' || c.last_name, c.first_name, c.email, 'Unknown') as contact_name,
    c.email::VARCHAR as contact_email,
    c.phone::VARCHAR as contact_phone,
    lm.msg_body as last_message,
    lm.msg_time as last_message_time,
    COALESCE(uc.uc_count, 0) as unread_count,
    lm.msg_sender_type::VARCHAR as sender_type,
    'client'::TEXT as contact_type
  FROM clients c
  JOIN latest_messages lm ON lm.msg_contact_id = c.id
  LEFT JOIN unread_counts uc ON uc.uc_contact_id = c.id
  WHERE c.organization_id = p_organization_id
  ORDER BY lm.msg_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_coach_conversations for backward compatibility
CREATE OR REPLACE FUNCTION get_coach_conversations(coach_user_id UUID)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email VARCHAR,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
  sender_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gac.contact_id as member_id,
    gac.contact_name as member_name,
    gac.contact_email as member_email,
    gac.last_message,
    gac.last_message_time,
    gac.unread_count,
    gac.sender_type
  FROM get_all_conversations(
    coach_user_id,
    (SELECT organization_id FROM user_organizations WHERE user_id = coach_user_id LIMIT 1)
  ) gac;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
