-- Fix messages table RLS to allow clients to send messages
-- This addresses the 403 error: "new row violates row-level security policy for table messages"

-- Drop existing policies
DROP POLICY IF EXISTS "Clients can send messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can read their messages" ON public.messages;
DROP POLICY IF EXISTS "Coaches can manage org messages" ON public.messages;

-- Create comprehensive policies for messages table

-- Allow clients to view messages in their conversations
CREATE POLICY "Clients can view their messages" 
ON public.messages FOR SELECT 
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE client_id IN (
      SELECT id FROM public.clients 
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow clients to send messages in their conversations  
CREATE POLICY "Clients can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  -- Ensure the conversation belongs to the client
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE client_id IN (
      SELECT id FROM public.clients 
      WHERE user_id = auth.uid()
    )
  )
  AND
  -- Ensure sender_id matches the client's ID
  sender_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid()
  )
  AND
  -- Ensure sender_type is 'client'
  sender_type = 'client'
);

-- Allow coaches/staff to view messages in their organization
CREATE POLICY "Staff can view org messages" 
ON public.messages FOR SELECT 
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow coaches/staff to send messages in their organization
CREATE POLICY "Staff can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  -- Ensure the conversation belongs to their organization
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid()
    )
  )
  AND
  -- Ensure sender_type is 'coach' for staff
  sender_type = 'coach'
);

-- Service role bypass for messages
DROP POLICY IF EXISTS "Service role bypass for messages" ON public.messages;
CREATE POLICY "Service role bypass for messages" 
ON public.messages FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Also ensure conversations table has proper policies
DROP POLICY IF EXISTS "Clients can create conversations" ON public.conversations;
CREATE POLICY "Clients can create conversations" 
ON public.conversations FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- Ensure clients can update their own conversations (e.g., mark as read)
DROP POLICY IF EXISTS "Clients can update their conversations" ON public.conversations;
CREATE POLICY "Clients can update their conversations" 
ON public.conversations FOR UPDATE
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON public.conversations(organization_id);