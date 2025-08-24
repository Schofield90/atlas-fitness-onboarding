-- Add integration_id column to facebook_pages
ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS integration_id UUID;

-- Add organization_id if missing
ALTER TABLE facebook_pages 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Check if foreign key to facebook_integrations exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'facebook_pages_integration_id_fkey'
    ) THEN
        ALTER TABLE facebook_pages 
        ADD CONSTRAINT facebook_pages_integration_id_fkey 
        FOREIGN KEY (integration_id) 
        REFERENCES facebook_integrations(id) 
        ON DELETE CASCADE;
    END IF;
    
    -- Check if foreign key to organizations exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'facebook_pages_organization_id_fkey'
    ) THEN
        ALTER TABLE facebook_pages 
        ADD CONSTRAINT facebook_pages_organization_id_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_facebook_pages_integration_id 
ON facebook_pages(integration_id);

CREATE INDEX IF NOT EXISTS idx_facebook_pages_org_id 
ON facebook_pages(organization_id);