-- Apply messaging schema fixes immediately
-- This script can be run directly in the database

-- Fix messaging schema issues
-- This migration addresses the console errors by updating the messages table structure

-- First, let's check if we need to update the messages table structure
-- The current table is missing some columns that the frontend expects

-- Add missing columns to messages table if they don't exist
DO $$ 
BEGIN
    -- Add channel column if it doesn't exist (rename type to channel for consistency)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'channel') THEN
        -- If type column exists, rename it to channel
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'type') THEN
            ALTER TABLE messages RENAME COLUMN type TO channel;
        ELSE
            -- Add channel column if neither exists
            ALTER TABLE messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'email' 
            CHECK (channel IN ('sms', 'whatsapp', 'email', 'in_app'));
        END IF;
    END IF;

    -- Add content column if it doesn't exist (rename body to content for consistency)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') THEN
        -- If body column exists, rename it to content
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'body') THEN
            ALTER TABLE messages RENAME COLUMN body TO content;
        ELSE
            -- Add content column if neither exists
            ALTER TABLE messages ADD COLUMN content TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;

    -- Add customer_id and client_id columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'customer_id') THEN
        ALTER TABLE messages ADD COLUMN customer_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'client_id') THEN
        ALTER TABLE messages ADD COLUMN client_id UUID;
    END IF;

    -- Add sender_id and sender_name columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
        ALTER TABLE messages ADD COLUMN sender_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_name') THEN
        ALTER TABLE messages ADD COLUMN sender_name TEXT;
    END IF;

    -- Update channel constraint to include in_app
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_check;
    ALTER TABLE messages ADD CONSTRAINT messages_channel_check 
    CHECK (channel IN ('sms', 'whatsapp', 'email', 'in_app'));

END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key for customer_id to clients table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_customer_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES clients(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for client_id to clients table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_client_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for sender_id to users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_sender_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);

-- Update RLS policies to work with the new structure
DROP POLICY IF EXISTS "Users can view their organization's messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages for their organization" ON messages;
DROP POLICY IF EXISTS "Users can update their organization's messages" ON messages;

-- Create updated RLS policies
CREATE POLICY "Users can view their organization's messages" ON messages
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their organization" ON messages
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's messages" ON messages
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Create a view for easier message querying with user metadata
CREATE OR REPLACE VIEW messages_with_user_info AS
SELECT 
    m.*,
    u.email as sender_email,
    u.raw_user_meta_data as user_metadata,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone
FROM messages m
LEFT JOIN users u ON m.sender_id = u.id
LEFT JOIN clients c ON (m.customer_id = c.id OR m.client_id = c.id);

-- Grant permissions on the view
GRANT SELECT ON messages_with_user_info TO authenticated;