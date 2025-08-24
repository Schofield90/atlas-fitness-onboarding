-- Comprehensive fix for facebook_pages table structure
-- This ensures the table matches what the code expects

-- 1. Add missing columns if they don't exist
ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;

ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS page_name TEXT;

ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS page_username TEXT;

ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS page_category TEXT;

ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS access_token TEXT;

ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

ALTER TABLE facebook_pages
ADD COLUMN IF NOT EXISTS integration_id UUID;

ALTER TABLE facebook_pages
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 2. Update constraints if needed (remove NOT NULL temporarily for migration)
ALTER TABLE facebook_pages 
ALTER COLUMN facebook_page_id DROP NOT NULL;

ALTER TABLE facebook_pages 
ALTER COLUMN page_name DROP NOT NULL;

ALTER TABLE facebook_pages 
ALTER COLUMN access_token DROP NOT NULL;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_facebook_pages_facebook_page_id 
ON facebook_pages(facebook_page_id);

CREATE INDEX IF NOT EXISTS idx_facebook_pages_organization_id 
ON facebook_pages(organization_id);

-- 4. Add unique constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'facebook_pages_org_fb_page_unique'
    ) THEN
        ALTER TABLE facebook_pages 
        ADD CONSTRAINT facebook_pages_org_fb_page_unique 
        UNIQUE(organization_id, facebook_page_id);
    END IF;
END $$;