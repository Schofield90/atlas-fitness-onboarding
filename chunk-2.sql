-- Chunk 2: Add Columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_pages' AND column_name = 'page_username') THEN
    ALTER TABLE facebook_pages ADD COLUMN page_username VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_pages' AND column_name = 'page_category') THEN
    ALTER TABLE facebook_pages ADD COLUMN page_category VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_pages' AND column_name = 'page_info') THEN
    ALTER TABLE facebook_pages ADD COLUMN page_info JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_pages' AND column_name = 'permissions') THEN
    ALTER TABLE facebook_pages ADD COLUMN permissions TEXT[] DEFAULT '{}';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_integrations' AND column_name = 'connection_status') THEN
    ALTER TABLE facebook_integrations ADD COLUMN connection_status VARCHAR DEFAULT 'connected';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_integrations' AND column_name = 'error_details') THEN
    ALTER TABLE facebook_integrations ADD COLUMN error_details JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facebook_integrations' AND column_name = 'last_sync_at') THEN
    ALTER TABLE facebook_integrations ADD COLUMN last_sync_at TIMESTAMPTZ;
  END IF;
END $$;