-- Fix in-app messaging between gym owners and clients
-- This ensures messages are properly delivered and not stuck in pending

-- 1. Ensure conversations table exists with proper structure
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Allow either client_id or lead_id, not both
  CONSTRAINT conversation_contact CHECK (
    (client_id IS NOT NULL AND lead_id IS NULL) OR 
    (client_id IS NULL AND lead_id IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach ON public.conversations(coach_id);

-- 2. Update messages table to support in-app messaging properly
DO $$
BEGIN
  -- Add conversation_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id UUID REFERENCES public.conversations(id);
  END IF;
  
  -- Add channel column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN channel VARCHAR(20) DEFAULT 'in_app';
  END IF;
  
  -- Add sender_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_type VARCHAR(20);
  END IF;
  
  -- Add sender_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_name'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_name VARCHAR(255);
  END IF;
END $$;

-- 3. Create or replace function to get or create conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_organization_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_lead_id UUID DEFAULT NULL,
  p_coach_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Validate input
  IF p_client_id IS NULL AND p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Either client_id or lead_id must be provided';
  END IF;
  
  IF p_client_id IS NOT NULL AND p_lead_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot provide both client_id and lead_id';
  END IF;
  
  -- Try to find existing conversation
  IF p_client_id IS NOT NULL THEN
    SELECT id INTO v_conversation_id
    FROM public.conversations
    WHERE organization_id = p_organization_id
      AND client_id = p_client_id
    LIMIT 1;
  ELSE
    SELECT id INTO v_conversation_id
    FROM public.conversations
    WHERE organization_id = p_organization_id
      AND lead_id = p_lead_id
    LIMIT 1;
  END IF;
  
  -- If not found, create new conversation
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (
      organization_id,
      client_id,
      lead_id,
      coach_id,
      title,
      status
    ) VALUES (
      p_organization_id,
      p_client_id,
      p_lead_id,
      p_coach_id,
      CASE 
        WHEN p_client_id IS NOT NULL THEN 'Client Conversation'
        ELSE 'Lead Conversation'
      END,
      'active'
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- 4. Create function to send in-app message
CREATE OR REPLACE FUNCTION public.send_inapp_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_sender_id UUID,
  p_sender_type VARCHAR,
  p_sender_name VARCHAR,
  p_organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_client_id UUID;
  v_lead_id UUID;
BEGIN
  -- Get client/lead from conversation
  SELECT client_id, lead_id 
  INTO v_client_id, v_lead_id
  FROM public.conversations
  WHERE id = p_conversation_id;
  
  -- Insert the message
  INSERT INTO public.messages (
    conversation_id,
    organization_id,
    client_id,
    lead_id,
    user_id,
    channel,
    type,
    sender_type,
    sender_name,
    direction,
    body,
    status,
    created_at
  ) VALUES (
    p_conversation_id,
    p_organization_id,
    v_client_id,
    v_lead_id,
    CASE WHEN p_sender_type = 'gym' THEN p_sender_id ELSE NULL END,
    'in_app',
    'in_app',
    p_sender_type,
    p_sender_name,
    CASE WHEN p_sender_type = 'client' THEN 'inbound' ELSE 'outbound' END,
    p_content,
    'delivered', -- In-app messages are instantly delivered
    NOW()
  )
  RETURNING id INTO v_message_id;
  
  -- Update conversation last_message_at
  UPDATE public.conversations 
  SET last_message_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN v_message_id;
END;
$$;

-- 5. Update RLS policies for messages
DROP POLICY IF EXISTS "messages_access" ON public.messages;

CREATE POLICY "messages_access" ON public.messages
FOR ALL
USING (
  -- Staff can see all messages in their organization
  (auth.uid() IS NOT NULL AND 
   organization_id IN (
     SELECT organization_id FROM public.user_organizations 
     WHERE user_id = auth.uid()
   ))
  OR
  -- Staff can see messages via users table
  (auth.uid() IS NOT NULL AND 
   organization_id IN (
     SELECT organization_id FROM public.users 
     WHERE id = auth.uid()
   ))
  OR
  -- Clients can see their own messages
  (auth.uid() IS NOT NULL AND 
   client_id IN (
     SELECT id FROM public.clients 
     WHERE user_id = auth.uid()
   ))
)
WITH CHECK (
  -- Same rules for insertion
  (auth.uid() IS NOT NULL AND 
   organization_id IN (
     SELECT organization_id FROM public.user_organizations 
     WHERE user_id = auth.uid()
   ))
  OR
  (auth.uid() IS NOT NULL AND 
   organization_id IN (
     SELECT organization_id FROM public.users 
     WHERE id = auth.uid()
   ))
  OR
  (auth.uid() IS NOT NULL AND 
   client_id IN (
     SELECT id FROM public.clients 
     WHERE user_id = auth.uid()
   ))
);

-- 6. Grant permissions
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_inapp_message TO authenticated;

-- 7. Fix any pending messages (mark them as delivered if they're in-app)
UPDATE public.messages
SET status = 'delivered',
    sent_at = COALESCE(sent_at, created_at)
WHERE channel = 'in_app' 
  AND status = 'pending';

-- 8. Create a trigger to auto-deliver in-app messages
CREATE OR REPLACE FUNCTION public.auto_deliver_inapp_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- If it's an in-app message, mark it as delivered immediately
  IF NEW.channel = 'in_app' OR NEW.type = 'in_app' THEN
    NEW.status := 'delivered';
    NEW.sent_at := COALESCE(NEW.sent_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_deliver_inapp_trigger ON public.messages;
CREATE TRIGGER auto_deliver_inapp_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_deliver_inapp_messages();

-- Success message
SELECT 'In-app messaging fix applied successfully!' as status;