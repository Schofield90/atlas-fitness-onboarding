-- Comprehensive fix for all potentially missing columns in messages table
-- This ensures compatibility with various cached schemas

-- Add direction column (for message direction: inbound/outbound)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'outbound'
CHECK (direction IN ('inbound', 'outbound'));

-- Add type column (alias for message_type)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS type VARCHAR(20);

-- Add metadata column for additional data
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add delivered_at timestamp
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Add failed_at timestamp
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE;

-- Add error_message for failed messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add retry_count for message retries
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add external_id for third-party message IDs
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Create function to sync type with message_type
CREATE OR REPLACE FUNCTION sync_type_with_message_type()
RETURNS TRIGGER AS $$
BEGIN
  NEW.type = COALESCE(NEW.message_type, NEW.type, 'text');
  NEW.message_type = COALESCE(NEW.message_type, NEW.type, 'text');
  
  -- Set direction based on sender_type
  IF NEW.sender_type = 'client' THEN
    NEW.direction = 'inbound';
  ELSE
    NEW.direction = 'outbound';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_type_trigger ON public.messages;

-- Create trigger to sync type fields
CREATE TRIGGER sync_type_trigger
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION sync_type_with_message_type();

-- Update existing rows to have proper direction
UPDATE public.messages 
SET direction = CASE 
  WHEN sender_type = 'client' THEN 'inbound'
  ELSE 'outbound'
END
WHERE direction IS NULL;

-- Update type column for existing rows
UPDATE public.messages 
SET type = message_type
WHERE type IS NULL AND message_type IS NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_messages_direction ON public.messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages(external_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

-- Ensure all required columns exist with proper defaults
ALTER TABLE public.messages 
ALTER COLUMN status SET DEFAULT 'sent',
ALTER COLUMN channel SET DEFAULT 'in_app',
ALTER COLUMN message_type SET DEFAULT 'text';

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT ON public.messages TO anon;