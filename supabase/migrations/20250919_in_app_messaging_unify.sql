-- Unify in-app messaging: add conversations table and align messages schema
-- Safe to run multiple times (IF NOT EXISTS guards)

-- 1) Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach ON public.conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- 2) Align messages table to support conversations and client-sent in-app messages
-- Add missing columns if needed
DO $$
BEGIN
  -- conversation_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id UUID;
  END IF;

  -- sender_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_type VARCHAR(10) CHECK (sender_type IN ('coach','client'));
  END IF;

  -- message_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','file','system'));
  END IF;

  -- Ensure channel column exists (added by prior fix) and supports 'in_app'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'in_app';
  END IF;

  -- Add FK for conversation_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'messages' AND constraint_name = 'messages_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);

-- 3) Update conversations timestamps when a new message is added
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.conversations 
    SET last_message_at = COALESCE(NEW.created_at, NOW()), updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- 4) Helper function to get or create a conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_organization_id UUID,
  p_client_id UUID,
  p_coach_id UUID
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE organization_id = p_organization_id
    AND client_id = p_client_id
    AND coach_id = p_coach_id
    AND status = 'active'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (organization_id, client_id, coach_id, title)
    VALUES (
      p_organization_id,
      p_client_id,
      p_coach_id,
      (SELECT name FROM public.clients WHERE id = p_client_id LIMIT 1)
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- 5) RLS policies for conversations and messages
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Staff access based on user_organizations
CREATE POLICY IF NOT EXISTS conversations_staff_select ON public.conversations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS conversations_staff_insert ON public.conversations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Clients can view their own conversations
CREATE POLICY IF NOT EXISTS conversations_client_select ON public.conversations
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- Messages: keep existing staff org-based policies and add client policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Clients can read their messages
CREATE POLICY IF NOT EXISTS messages_client_select ON public.messages
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- Clients can send in-app messages to their own conversation
CREATE POLICY IF NOT EXISTS messages_client_insert ON public.messages
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    AND channel = 'in_app'
    AND sender_type = 'client'
  );

-- 6) Ensure channel allows 'in_app'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_channel_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_channel_check
  CHECK (channel IN ('sms','whatsapp','email','in_app'));

