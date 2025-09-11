-- Add customer_id as an alias for client_id in messages table
-- This fixes compatibility issues with cached schemas

-- Add customer_id column if it doesn't exist (as a copy of client_id)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Create a trigger to keep customer_id in sync with client_id
CREATE OR REPLACE FUNCTION sync_customer_id_with_client_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.customer_id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS sync_customer_id_trigger ON public.messages;

-- Create the trigger
CREATE TRIGGER sync_customer_id_trigger
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION sync_customer_id_with_client_id();

-- Update existing rows
UPDATE public.messages 
SET customer_id = client_id 
WHERE customer_id IS NULL AND client_id IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON public.messages(customer_id);

-- Add foreign key constraint
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_customer_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES clients(id) ON DELETE CASCADE;