-- Create the missing messages_with_user_info view
CREATE OR REPLACE VIEW public.messages_with_user_info AS
SELECT 
  m.id,
  m.conversation_id,
  m.client_id,
  m.customer_id,
  m.organization_id,
  m.channel,
  m.sender_type,
  m.sender_name,
  m.sender_id,
  m.message_type,
  m.type,
  m.direction,
  m.content,
  m.status,
  m.metadata,
  m.created_at,
  m.updated_at,
  -- Add user info if sender is a staff member
  CASE 
    WHEN m.sender_id IS NOT NULL THEN u.email
    ELSE NULL
  END as sender_email,
  CASE 
    WHEN m.sender_id IS NOT NULL THEN u.full_name
    ELSE m.sender_name
  END as display_name,
  -- Add client info
  c.name as client_name,
  c.email as client_email,
  c.phone as client_phone
FROM public.messages m
LEFT JOIN public.users u ON m.sender_id = u.id
LEFT JOIN public.clients c ON m.client_id = c.id;

-- Grant permissions
GRANT SELECT ON public.messages_with_user_info TO authenticated;
GRANT SELECT ON public.messages_with_user_info TO anon;

-- Ensure conversations table exists with proper structure
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id UUID,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'conversations_organization_id_client_id_coach_id_key'
  ) THEN
    ALTER TABLE public.conversations 
    ADD CONSTRAINT conversations_organization_id_client_id_coach_id_key 
    UNIQUE(organization_id, client_id, coach_id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);

-- Drop and recreate the get_or_create_conversation function
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_organization_id UUID,
  p_client_id UUID,
  p_coach_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- First try to find an existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE organization_id = p_organization_id
    AND client_id = p_client_id
    AND (coach_id = p_coach_id OR (coach_id IS NULL AND p_coach_id IS NULL))
  LIMIT 1;
  
  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      organization_id,
      client_id,
      coach_id,
      status,
      created_at,
      updated_at
    )
    VALUES (
      p_organization_id,
      p_client_id,
      p_coach_id,
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (organization_id, client_id, coach_id) 
    DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_conversation_id;
  END IF;
  
  -- Return the conversation ID
  RETURN v_conversation_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE NOTICE 'Error in get_or_create_conversation: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID) TO service_role;

-- Grant table permissions
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

-- Create simple RLS policies for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.conversations;

-- Create new policy
CREATE POLICY "Enable all for authenticated users" ON public.conversations
  FOR ALL USING (true) WITH CHECK (true);