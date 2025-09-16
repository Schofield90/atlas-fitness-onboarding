-- Add metadata column to transactions table if it doesn't exist
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;