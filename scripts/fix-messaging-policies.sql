-- Fix RLS policies for conversations and messages

-- Drop existing policies if they exist
DROP POLICY IF EXISTS conversations_staff_select ON public.conversations;
DROP POLICY IF EXISTS conversations_staff_insert ON public.conversations;
DROP POLICY IF EXISTS conversations_client_select ON public.conversations;
DROP POLICY IF EXISTS messages_client_select ON public.messages;
DROP POLICY IF EXISTS messages_client_insert ON public.messages;

-- Create policies for conversations
CREATE POLICY conversations_staff_select ON public.conversations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY conversations_staff_insert ON public.conversations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Clients can view their own conversations
CREATE POLICY conversations_client_select ON public.conversations
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- Messages: clients can read their messages
CREATE POLICY messages_client_select ON public.messages
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- Clients can send in-app messages to their own conversation
CREATE POLICY messages_client_insert ON public.messages
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    AND channel = 'in_app'
    AND sender_type = 'client'
  );

-- Add the channel check constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_channel_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_channel_check
  CHECK (channel IN ('sms','whatsapp','email','in_app'));