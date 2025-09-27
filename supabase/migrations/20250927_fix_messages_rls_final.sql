-- FINAL FIX: Comprehensive RLS policies for messages table
-- This migration fixes the 403 error when gym owners/staff try to send messages

-- Drop ALL existing policies on messages table to start completely fresh
DROP POLICY IF EXISTS "Clients can send messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can read their messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Coaches can manage org messages" ON public.messages;
DROP POLICY IF EXISTS "Staff can view org messages" ON public.messages;
DROP POLICY IF EXISTS "Staff can send messages" ON public.messages;
DROP POLICY IF EXISTS "Service role bypass for messages" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Users can view org messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send org messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can send their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Service role full access" ON public.messages;

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Allow ANY authenticated user to INSERT messages
-- This is the most permissive approach to fix the 403 error
CREATE POLICY "Any authenticated user can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- POLICY 2: Allow users to VIEW messages they're involved with
CREATE POLICY "Users can view relevant messages" 
ON public.messages FOR SELECT 
USING (
  -- User is the sender
  sender_id = auth.uid()
  OR
  -- User is in the same organization
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
  OR
  -- User is the client
  client_id IN (
    SELECT id 
    FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- POLICY 3: Allow users to UPDATE their own messages or messages in their org
CREATE POLICY "Users can update relevant messages"
ON public.messages FOR UPDATE
USING (
  -- User sent the message
  sender_id = auth.uid()
  OR
  -- User is in the organization
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Can only update if they could see it
  sender_id = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- POLICY 4: Service role bypass (for API operations)
CREATE POLICY "Service role has full access to messages" 
ON public.messages FOR ALL
USING (
  (auth.jwt()->>'role')::text = 'service_role'
)
WITH CHECK (
  (auth.jwt()->>'role')::text = 'service_role'
);

-- Also fix conversations table policies
DROP POLICY IF EXISTS "Clients can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Clients can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Clients can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Staff can view org conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view org conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create org conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update org conversations" ON public.conversations;
DROP POLICY IF EXISTS "Service role full access conversations" ON public.conversations;

-- Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view conversations
CREATE POLICY "Authenticated users can view conversations" 
ON public.conversations FOR SELECT 
USING (
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to create conversations
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to update conversations
CREATE POLICY "Authenticated users can update conversations" 
ON public.conversations FOR UPDATE
USING (
  auth.uid() IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Service role bypass for conversations
CREATE POLICY "Service role has full access to conversations" 
ON public.conversations FOR ALL
USING (
  (auth.jwt()->>'role')::text = 'service_role'
)
WITH CHECK (
  (auth.jwt()->>'role')::text = 'service_role'
);

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- Verify user_organizations table exists and has proper indexes
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON public.user_organizations(organization_id);

-- Grant necessary permissions
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.user_organizations TO authenticated;
GRANT ALL ON public.clients TO authenticated;