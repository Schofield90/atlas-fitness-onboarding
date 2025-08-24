-- Add missing facebook_page_id column to facebook_pages table
ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS facebook_page_id VARCHAR;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_facebook_pages_facebook_page_id 
ON facebook_pages(facebook_page_id);

-- Add unique constraint for organization and facebook page combination
ALTER TABLE facebook_pages 
DROP CONSTRAINT IF EXISTS facebook_pages_org_fb_page_unique;

ALTER TABLE facebook_pages 
ADD CONSTRAINT facebook_pages_org_fb_page_unique 
UNIQUE(organization_id, facebook_page_id);