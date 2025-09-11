-- Fix messages table structure for client messaging

-- Add missing organization_id column
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Make sender_id nullable for client messages (since clients don't have user records in users table)
ALTER TABLE public.messages 
ALTER COLUMN sender_id DROP NOT NULL;

-- Add sender_id to clients relationship
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey1;

-- Update the check constraint for sender_type to be nullable
ALTER TABLE public.messages
ALTER COLUMN sender_type DROP NOT NULL;

-- Create index for organization_id
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON public.messages(organization_id);

-- Update RLS policies to handle client messages properly
DROP POLICY IF EXISTS "Clients can send messages" ON public.messages;
CREATE POLICY "Clients can send messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    AND channel = 'in_app'
  );

-- Add a policy for staff to see all messages in their organization
DROP POLICY IF EXISTS "Staff can view organization messages" ON public.messages;
CREATE POLICY "Staff can view organization messages" ON public.messages
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Ensure the status column exists
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';