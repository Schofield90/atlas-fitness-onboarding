-- Comprehensive fix for messages table RLS policies
-- This addresses the 403 error when sending messages from both clients and staff/owners

-- First, drop ALL existing policies on messages table to start fresh
DROP POLICY IF EXISTS "Clients can send messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can read their messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Coaches can manage org messages" ON public.messages;
DROP POLICY IF EXISTS "Staff can view org messages" ON public.messages;
DROP POLICY IF EXISTS "Staff can send messages" ON public.messages;
DROP POLICY IF EXISTS "Service role bypass for messages" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.messages;

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 1. Allow authenticated users to view messages in their organization's conversations
CREATE POLICY "Users can view org messages" 
ON public.messages FOR SELECT 
USING (
  -- Check if user is part of the organization
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
  OR
  -- Or if they're a client viewing their own messages
  client_id IN (
    SELECT id 
    FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- 2. Allow authenticated users (staff/owners) to send messages in their organization
CREATE POLICY "Users can send org messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  -- User must be part of the organization
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
  AND
  -- sender_id should be the auth user's ID
  sender_id = auth.uid()
  AND
  -- sender_type should be 'coach' for staff/owners
  sender_type = 'coach'
);

-- 3. Allow clients to send messages in their conversations
CREATE POLICY "Clients can send their messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  -- Client must exist and be linked to the auth user
  client_id IN (
    SELECT id 
    FROM public.clients 
    WHERE user_id = auth.uid()
  )
  AND
  -- sender_id should match the client's ID
  sender_id IN (
    SELECT id 
    FROM public.clients 
    WHERE user_id = auth.uid()
  )
  AND
  -- sender_type should be 'client'
  sender_type = 'client'
);

-- 4. Allow users to update messages they sent (for read receipts, etc.)
CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (
  sender_id = auth.uid()
  OR
  -- Allow updating messages in conversations the user is part of (for read receipts)
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
  OR
  client_id IN (
    SELECT id 
    FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- 5. Service role bypass (for API operations)
CREATE POLICY "Service role full access" 
ON public.messages FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Also fix conversations table policies
DROP POLICY IF EXISTS "Clients can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Clients can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Clients can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Staff can view org conversations" ON public.conversations;

-- Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Allow users to view conversations in their organization
CREATE POLICY "Users can view org conversations" 
ON public.conversations FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
  OR
  client_id IN (
    SELECT id 
    FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to create conversations in their organization
CREATE POLICY "Users can create org conversations" 
ON public.conversations FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to update conversations in their organization
CREATE POLICY "Users can update org conversations" 
ON public.conversations FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
  OR
  client_id IN (
    SELECT id 
    FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- Service role bypass for conversations
CREATE POLICY "Service role full access conversations" 
ON public.conversations FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON public.user_organizations(organization_id);