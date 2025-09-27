-- Fix conversations table to allow null coach_id for client-initiated conversations
-- This allows clients to start conversations before a coach is assigned

-- Make coach_id nullable
ALTER TABLE public.conversations 
ALTER COLUMN coach_id DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN public.conversations.coach_id IS 'ID of the coach/staff member. Can be NULL for client-initiated conversations that haven''t been assigned to a coach yet.';

-- Update RLS policies to handle null coach_id
DROP POLICY IF EXISTS "Clients can view their conversations" ON public.conversations;
CREATE POLICY "Clients can view their conversations" 
ON public.conversations FOR SELECT 
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Coaches can view org conversations" ON public.conversations;
CREATE POLICY "Coaches can view org conversations" 
ON public.conversations FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role bypass for conversations" ON public.conversations;
CREATE POLICY "Service role bypass for conversations" 
ON public.conversations FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Create a function to auto-assign coaches to conversations when messages are sent
CREATE OR REPLACE FUNCTION auto_assign_coach_to_conversation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the conversation doesn't have a coach and a coach/staff is sending a message
  IF NEW.sender_type = 'coach' AND EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = NEW.conversation_id 
    AND coach_id IS NULL
  ) THEN
    -- Try to identify the coach from the message sender
    UPDATE conversations
    SET coach_id = NEW.sender_id,
        updated_at = NOW()
    WHERE id = NEW.conversation_id
    AND coach_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign coaches
DROP TRIGGER IF EXISTS auto_assign_coach_on_message ON messages;
CREATE TRIGGER auto_assign_coach_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION auto_assign_coach_to_conversation();

-- Update the get_or_create_conversation function to handle null coach_id
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_organization_id UUID,
  p_client_id UUID,
  p_coach_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE organization_id = p_organization_id
    AND client_id = p_client_id
  LIMIT 1;
  
  IF v_conversation_id IS NULL THEN
    -- Create new conversation (coach_id can be null)
    INSERT INTO conversations (organization_id, client_id, coach_id, status)
    VALUES (p_organization_id, p_client_id, p_coach_id, 'active')
    RETURNING id INTO v_conversation_id;
  ELSIF p_coach_id IS NOT NULL THEN
    -- Update coach_id if provided and currently null
    UPDATE conversations 
    SET coach_id = p_coach_id,
        updated_at = NOW()
    WHERE id = v_conversation_id 
    AND coach_id IS NULL;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;