-- CLEAN FIX: Reset and fix RLS policies for messages table
-- This migration safely handles existing policies and fixes the 403 error

-- First, drop ALL existing policies on messages table (handle if they don't exist)
DO $$ 
BEGIN
    -- Drop all possible policy names that might exist
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
    DROP POLICY IF EXISTS "Service role has full access to messages" ON public.messages;
    DROP POLICY IF EXISTS "Any authenticated user can send messages" ON public.messages;
    DROP POLICY IF EXISTS "Users can view relevant messages" ON public.messages;
    DROP POLICY IF EXISTS "Users can update relevant messages" ON public.messages;
END $$;

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies

-- POLICY 1: Allow ANY authenticated user to INSERT messages (most permissive)
CREATE POLICY "authenticated_can_insert_messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- POLICY 2: Allow users to VIEW messages in their context
CREATE POLICY "authenticated_can_view_messages" 
ON public.messages FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- User is the sender
    sender_id = auth.uid()
    OR
    -- User is in the same organization
    EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND organization_id = messages.organization_id
    )
    OR
    -- User is the client
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE user_id = auth.uid() 
      AND id = messages.client_id
    )
  )
);

-- POLICY 3: Allow users to UPDATE messages they can see
CREATE POLICY "authenticated_can_update_messages"
ON public.messages FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    sender_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND organization_id = messages.organization_id
    )
  )
);

-- POLICY 4: Service role bypass
CREATE POLICY "service_role_bypass_messages" 
ON public.messages FOR ALL
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- Now handle conversations table
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Clients can create conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Clients can update their conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Clients can view their conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Staff can view org conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Users can view org conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Users can create org conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Users can update org conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Service role full access conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Service role has full access to conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.conversations;
END $$;

-- Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Simple conversation policies
CREATE POLICY "authenticated_can_view_conversations" 
ON public.conversations FOR SELECT 
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "authenticated_can_create_conversations" 
ON public.conversations FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "authenticated_can_update_conversations" 
ON public.conversations FOR UPDATE
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "service_role_bypass_conversations" 
ON public.conversations FOR ALL
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- Create indexes for performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_organization_id') THEN
        CREATE INDEX idx_messages_organization_id ON public.messages(organization_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_conversation_id') THEN
        CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_sender_id') THEN
        CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_client_id') THEN
        CREATE INDEX idx_messages_client_id ON public.messages(client_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_created_at') THEN
        CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT SELECT ON public.user_organizations TO authenticated;
GRANT SELECT ON public.clients TO authenticated;