-- Complete Messaging System Migration
-- This migration fixes the foreign key constraint violations in the messaging system

-- ============================================
-- STEP 1: Fix Messages Table Schema
-- ============================================

-- Add missing columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add check constraints
DO $$
BEGIN
  -- Drop existing constraints if they exist
  ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_channel_check;
  ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
  ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
  
  -- Add new constraints
  ALTER TABLE public.messages ADD CONSTRAINT messages_channel_check 
    CHECK (channel IN ('sms', 'whatsapp', 'email', 'in_app'));
  
  ALTER TABLE public.messages ADD CONSTRAINT messages_sender_type_check 
    CHECK (sender_type IN ('client', 'coach', 'staff', 'system', 'ai'));
  
  ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video'));
END $$;

-- Update existing messages to have default values
UPDATE public.messages SET 
  channel = CASE 
    WHEN type = 'sms' THEN 'sms'
    WHEN type = 'whatsapp' THEN 'whatsapp'
    WHEN type = 'email' THEN 'email'
    ELSE 'in_app'
  END
WHERE channel IS NULL;

UPDATE public.messages SET 
  sender_type = CASE 
    WHEN direction = 'outbound' THEN 'staff'
    ELSE 'client'
  END
WHERE sender_type IS NULL;

UPDATE public.messages SET 
  message_type = 'text'
WHERE message_type IS NULL;

-- Copy body to content if content is empty
UPDATE public.messages SET 
  content = body
WHERE content IS NULL AND body IS NOT NULL;

-- ============================================
-- STEP 2: Create Conversations Table
-- ============================================

-- Create conversations table with proper structure
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  coach_id UUID,
  status VARCHAR(50) DEFAULT 'active',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for client_id (only if clients table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE public.conversations 
      DROP CONSTRAINT IF EXISTS conversations_client_id_fkey;
    ALTER TABLE public.conversations 
      ADD CONSTRAINT conversations_client_id_fkey 
      FOREIGN KEY (client_id) 
      REFERENCES public.clients(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- ============================================
-- STEP 3: Add Foreign Key Constraint to Messages
-- ============================================

-- Drop any existing foreign key constraints
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey,
  DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey1,
  DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey2;

-- Add the foreign key constraint
ALTER TABLE public.messages 
  ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) 
  REFERENCES public.conversations(id) 
  ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_client ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON public.messages(organization_id);

-- ============================================
-- STEP 4: Create get_or_create_conversation Function
-- ============================================

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_organization_id UUID,
  p_client_id UUID,
  p_coach_id UUID DEFAULT NULL
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
      updated_at,
      last_message_at
    )
    VALUES (
      p_organization_id,
      p_client_id,
      p_coach_id,
      'active',
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (organization_id, client_id, coach_id) 
    DO UPDATE SET 
      updated_at = NOW(),
      last_message_at = NOW()
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

-- ============================================
-- STEP 5: Set up Table Permissions
-- ============================================

-- Grant table permissions for conversations
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT ON public.conversations TO anon;

-- Grant table permissions for messages
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT SELECT ON public.messages TO anon;

-- ============================================
-- STEP 6: Enable and Configure RLS
-- ============================================

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create new comprehensive policy for conversations
CREATE POLICY "Enable all for authenticated users" ON public.conversations
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Enable RLS on messages if not already enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy for messages if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messages' 
    AND policyname = 'Enable all for authenticated users'
  ) THEN
    CREATE POLICY "Enable all for authenticated users" ON public.messages
      FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- STEP 7: Create Messages View
-- ============================================

-- Create or replace the messages_with_user_info view
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

-- Grant permissions on the view
GRANT SELECT ON public.messages_with_user_info TO authenticated;
GRANT SELECT ON public.messages_with_user_info TO anon;
GRANT SELECT ON public.messages_with_user_info TO service_role;

-- ============================================
-- STEP 8: Verification Queries
-- ============================================

-- Display verification results
DO $$
DECLARE
  conv_exists BOOLEAN;
  msg_conv_col BOOLEAN;
  msg_channel_col BOOLEAN;
  func_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  -- Check conversations table
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations'
  ) INTO conv_exists;
  
  -- Check messages.conversation_id column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'conversation_id'
  ) INTO msg_conv_col;
  
  -- Check messages.channel column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'channel'
  ) INTO msg_channel_col;
  
  -- Check function exists
  SELECT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_or_create_conversation'
  ) INTO func_exists;
  
  -- Check view exists
  SELECT EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'messages_with_user_info'
  ) INTO view_exists;
  
  RAISE NOTICE '=== Migration Verification Results ===';
  RAISE NOTICE 'Conversations table exists: %', conv_exists;
  RAISE NOTICE 'Messages.conversation_id column exists: %', msg_conv_col;
  RAISE NOTICE 'Messages.channel column exists: %', msg_channel_col;
  RAISE NOTICE 'get_or_create_conversation function exists: %', func_exists;
  RAISE NOTICE 'messages_with_user_info view exists: %', view_exists;
  RAISE NOTICE '=====================================';
END $$;

-- Final success message
SELECT 'Migration completed successfully!' as status;