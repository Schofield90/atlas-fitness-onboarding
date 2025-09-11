-- Add missing sender_name column to messages table
-- This fixes the "Could not find the 'sender_name' column of 'messages' in the schema cache" error

-- Add sender_name column if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);

-- Create function to automatically set sender_name based on sender_type
CREATE OR REPLACE FUNCTION set_sender_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Set sender_name based on sender_type and available data
  IF NEW.sender_type = 'client' THEN
    -- For client messages, try to get the client's name
    SELECT COALESCE(name, email, 'Client') INTO NEW.sender_name
    FROM public.clients
    WHERE id = NEW.client_id;
    
    -- Fallback if no client found
    IF NEW.sender_name IS NULL THEN
      NEW.sender_name = 'Client';
    END IF;
  ELSIF NEW.sender_type = 'user' AND NEW.sender_id IS NOT NULL THEN
    -- For user messages, try to get the user's name from auth.users
    SELECT COALESCE(raw_user_meta_data->>'full_name', email, 'Coach') INTO NEW.sender_name
    FROM auth.users
    WHERE id = NEW.sender_id;
    
    -- Fallback if no user found
    IF NEW.sender_name IS NULL THEN
      NEW.sender_name = 'Coach';
    END IF;
  ELSIF NEW.sender_type = 'system' THEN
    NEW.sender_name = 'System';
  ELSE
    -- Default fallback
    NEW.sender_name = COALESCE(NEW.sender_name, 'Unknown');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_sender_name_trigger ON public.messages;

-- Create trigger to set sender_name
CREATE TRIGGER set_sender_name_trigger
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION set_sender_name();

-- Update existing rows to have sender_name
UPDATE public.messages m
SET sender_name = CASE 
  WHEN m.sender_type = 'client' THEN 
    COALESCE((SELECT name FROM public.clients WHERE id = m.client_id), 'Client')
  WHEN m.sender_type = 'user' AND m.sender_id IS NOT NULL THEN
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = m.sender_id), 'Coach')
  WHEN m.sender_type = 'system' THEN
    'System'
  ELSE 
    'Unknown'
END
WHERE sender_name IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_name ON public.messages(sender_name);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT ON public.messages TO anon;