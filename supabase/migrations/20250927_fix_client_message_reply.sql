-- Fix client message reply permissions
-- This allows clients to send messages back to gym owners/coaches

-- First, drop the existing insert policy to replace it
DROP POLICY IF EXISTS "authenticated_can_insert_messages" ON public.messages;

-- Create separate policies for coaches/owners and clients

-- POLICY 1: Allow coaches/owners to send messages (sender_type = 'coach')
CREATE POLICY "coaches_can_send_messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    -- Coach/owner sending a message
    (sender_type = 'coach' AND sender_id = auth.uid())
    OR
    -- Allow service role
    (auth.jwt()->>'role' = 'service_role')
  )
);

-- POLICY 2: Allow clients to send messages (sender_type = 'client')
CREATE POLICY "clients_can_send_messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    -- Client sending a message - sender_id should be the client record ID, not the user ID
    sender_type = 'client' 
    AND EXISTS (
      SELECT 1 FROM public.clients 
      WHERE id = messages.sender_id 
      AND user_id = auth.uid()
    )
  )
);

-- Also update the conversations insert policy to allow clients to create conversations
DROP POLICY IF EXISTS "authenticated_can_create_conversations" ON public.conversations;

CREATE POLICY "authenticated_can_create_conversations" 
ON public.conversations FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- Owner/coach creating conversation
    EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND organization_id = conversations.organization_id
    )
    OR
    -- Client creating conversation
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE id = conversations.client_id 
      AND user_id = auth.uid()
    )
    OR
    -- Service role
    (auth.jwt()->>'role' = 'service_role')
  )
);

-- Grant necessary permissions
GRANT INSERT, SELECT ON public.messages TO authenticated;
GRANT INSERT, SELECT, UPDATE ON public.conversations TO authenticated;