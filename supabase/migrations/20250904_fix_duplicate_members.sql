-- Fix duplicate members issue
-- 1. First, identify and keep only the most recent version of duplicates

-- Create temporary table to identify duplicates
WITH duplicate_emails AS (
  SELECT 
    email,
    org_id,
    COUNT(*) as count
  FROM clients
  WHERE email IS NOT NULL
  GROUP BY email, org_id
  HAVING COUNT(*) > 1
),
clients_to_keep AS (
  SELECT DISTINCT ON (c.email, c.org_id) 
    c.id
  FROM clients c
  INNER JOIN duplicate_emails de 
    ON c.email = de.email 
    AND c.org_id = de.org_id
  ORDER BY c.email, c.org_id, c.updated_at DESC NULLS LAST, c.created_at DESC
)
-- Delete older duplicates, keeping the most recent
DELETE FROM clients
WHERE email IN (SELECT email FROM duplicate_emails)
  AND id NOT IN (SELECT id FROM clients_to_keep);

-- 2. Add unique constraint to prevent future duplicates
-- Only add if it doesn't already exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'clients_email_org_unique'
  ) THEN
    ALTER TABLE clients 
    ADD CONSTRAINT clients_email_org_unique 
    UNIQUE(email, org_id);
  END IF;
END $$;

-- 3. Create index for better performance on email lookups if not exists
CREATE INDEX IF NOT EXISTS idx_clients_email_org 
ON clients(email, org_id) 
WHERE email IS NOT NULL;

-- 4. Add organization_id column if it doesn't exist and sync with org_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'clients' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN organization_id UUID;
    UPDATE clients SET organization_id = org_id WHERE org_id IS NOT NULL;
  END IF;
END $$;

-- 5. Create a trigger to auto-sync org_id and organization_id fields
CREATE OR REPLACE FUNCTION sync_client_org_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If organization_id is set but org_id is not, sync them
  IF NEW.organization_id IS NOT NULL AND NEW.org_id IS NULL THEN
    NEW.org_id := NEW.organization_id;
  -- If org_id is set but organization_id is not, sync them
  ELSIF NEW.org_id IS NOT NULL AND NEW.organization_id IS NULL THEN
    NEW.organization_id := NEW.org_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_client_org_fields_trigger ON clients;
CREATE TRIGGER sync_client_org_fields_trigger
BEFORE INSERT OR UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION sync_client_org_fields();

-- 6. Add helpful comment
COMMENT ON CONSTRAINT clients_email_org_unique ON clients IS 
'Ensures no duplicate email addresses within the same organization';