-- Fix to ensure gym messages reach clients by properly setting conversation_id

-- 1. First, create the conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID,
  coach_id UUID,
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);

-- 3. Create function to get or create conversation
CREATE OR REPLACE FUNCTION public.get_or_create_client_conversation(
  p_organization_id UUID,
  p_client_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE organization_id = p_organization_id
    AND client_id = p_client_id
  LIMIT 1;
  
  -- If not found, create new conversation
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (
      organization_id,
      client_id,
      title,
      status
    ) VALUES (
      p_organization_id,
      p_client_id,
      'Client Conversation',
      'active'
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- 4. Fix existing messages without conversation_id
-- Match messages to clients and create conversations
DO $$
DECLARE
  msg RECORD;
  conv_id UUID;
BEGIN
  FOR msg IN 
    SELECT DISTINCT m.organization_id, m.client_id
    FROM public.messages m
    WHERE m.conversation_id IS NULL 
      AND m.client_id IS NOT NULL
      AND m.organization_id IS NOT NULL
  LOOP
    -- Get or create conversation for this client
    conv_id := public.get_or_create_client_conversation(
      msg.organization_id,
      msg.client_id
    );
    
    -- Update all messages for this client to use the conversation
    UPDATE public.messages
    SET conversation_id = conv_id
    WHERE organization_id = msg.organization_id
      AND client_id = msg.client_id
      AND conversation_id IS NULL;
  END LOOP;
END $$;

-- 5. Create a trigger to automatically set conversation_id for new messages
CREATE OR REPLACE FUNCTION public.auto_set_conversation_id()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- If no conversation_id but we have client_id and org_id
  IF NEW.conversation_id IS NULL AND NEW.client_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
    -- Get or create conversation
    v_conversation_id := public.get_or_create_client_conversation(
      NEW.organization_id,
      NEW.client_id
    );
    NEW.conversation_id := v_conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS auto_set_conversation_trigger ON public.messages;

-- Create trigger
CREATE TRIGGER auto_set_conversation_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_conversation_id();

-- 6. Grant permissions
GRANT ALL ON public.conversations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_client_conversation TO authenticated;

-- Report results
SELECT 
  COUNT(*) as messages_fixed,
  COUNT(DISTINCT conversation_id) as conversations_created
FROM public.messages
WHERE conversation_id IS NOT NULL
  AND client_id IS NOT NULL;

SELECT 'Gym-client messaging fix applied!' as status;