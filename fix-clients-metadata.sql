-- Add metadata column to clients table if it doesn't exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for metadata
CREATE INDEX IF NOT EXISTS idx_clients_metadata ON clients USING GIN (metadata);