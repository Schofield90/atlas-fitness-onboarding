-- Ensure unique client per org by lower(email). Create a derived column for lowercased email.
DO $$
BEGIN
  -- Add email_lower column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'email_lower'
  ) THEN
    ALTER TABLE clients ADD COLUMN email_lower TEXT;
  END IF;

  -- Backfill email_lower
  UPDATE clients SET email_lower = LOWER(TRIM(email)) WHERE email IS NOT NULL AND (email_lower IS NULL OR email_lower <> LOWER(TRIM(email)));

  -- Create partial unique index by org on email_lower, supporting both organization_id and org_id
  -- First index for organization_id
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_clients_org_email_orgid
    ON clients(organization_id, email_lower)
    WHERE organization_id IS NOT NULL AND email_lower IS NOT NULL AND email_lower <> '';

  -- Second index for org_id
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_clients_org_email_org
    ON clients(org_id, email_lower)
    WHERE org_id IS NOT NULL AND email_lower IS NOT NULL AND email_lower <> '';

  -- Trigger to keep email_lower in sync
  CREATE OR REPLACE FUNCTION set_clients_email_lower()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.email_lower := CASE WHEN NEW.email IS NULL THEN NULL ELSE LOWER(TRIM(NEW.email)) END;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_set_clients_email_lower ON clients;
  CREATE TRIGGER trg_set_clients_email_lower
    BEFORE INSERT OR UPDATE OF email ON clients
    FOR EACH ROW EXECUTE FUNCTION set_clients_email_lower();
END $$;

