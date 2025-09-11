-- Fix messages table schema to support client conversations
-- Add missing columns that the client messaging system expects

-- Add conversation_id column (nullable for backward compatibility with existing messages)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- Add client_id column (nullable for backward compatibility)  
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_id UUID;

-- Add customer_id column as alias for client_id (compatibility)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Add channel column for different message types
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS channel TEXT CHECK (channel IN ('sms', 'whatsapp', 'email', 'in_app'));

-- Add sender_type column  
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_type TEXT CHECK (sender_type IN ('client', 'coach', 'staff', 'system', 'ai'));

-- Add sender_name column
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Add sender_id column (for staff/coaches)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID;

-- Add message_type column
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video'));

-- Add content column as alias for body
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;

-- Add metadata column for additional data
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing messages to have default values
UPDATE public.messages SET 
  channel = CASE 
    WHEN type = 'sms' THEN 'sms'
    WHEN type = 'whatsapp' THEN 'whatsapp'
    WHEN type = 'email' THEN 'email'
    ELSE 'email'
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

UPDATE public.messages SET 
  content = body
WHERE content IS NULL AND body IS NOT NULL;

UPDATE public.messages SET 
  sender_id = user_id
WHERE sender_id IS NULL AND user_id IS NOT NULL;

-- Add foreign key constraints for client_id (with validation disabled to handle existing data)
ALTER TABLE public.messages ADD CONSTRAINT fk_messages_client_id 
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL NOT VALID;

-- Add foreign key constraints for conversation_id (with validation disabled)  
ALTER TABLE public.messages ADD CONSTRAINT fk_messages_conversation_id
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL NOT VALID;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel);

-- Update the RLS policies to handle client messages
DROP POLICY IF EXISTS "Clients can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can create their messages" ON public.messages;

-- Allow clients to view their own messages
CREATE POLICY "Clients can view their messages" ON public.messages
  FOR SELECT
  USING (
    -- Staff can see all messages in their organization
    (auth.uid() IN (
      SELECT id FROM public.users WHERE organization_id = messages.organization_id
    ))
    OR
    -- Clients can see their own messages
    (client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid() OR email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    ))
  );

-- Allow clients to create their own messages
CREATE POLICY "Clients can create messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    -- Staff can create messages for their organization
    (auth.uid() IN (
      SELECT id FROM public.users WHERE organization_id = messages.organization_id
    ))
    OR
    -- Clients can create their own messages
    (client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid() OR email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    ))
  );

-- Allow updates to message status (for read receipts, etc.)
CREATE POLICY "Users can update message status" ON public.messages
  FOR UPDATE
  USING (
    -- Staff can update messages in their organization
    (auth.uid() IN (
      SELECT id FROM public.users WHERE organization_id = messages.organization_id  
    ))
    OR
    -- Clients can update their own messages
    (client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid() OR email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    ))
  );

-- Create function to sync customer_id with client_id
CREATE OR REPLACE FUNCTION sync_customer_client_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- If client_id is set but customer_id is not, sync it
  IF NEW.client_id IS NOT NULL AND NEW.customer_id IS NULL THEN
    NEW.customer_id := NEW.client_id;
  END IF;
  
  -- If customer_id is set but client_id is not, sync it  
  IF NEW.customer_id IS NOT NULL AND NEW.client_id IS NULL THEN
    NEW.client_id := NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep client_id and customer_id in sync
DROP TRIGGER IF EXISTS sync_customer_client_ids_trigger ON public.messages;
CREATE TRIGGER sync_customer_client_ids_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_client_ids();