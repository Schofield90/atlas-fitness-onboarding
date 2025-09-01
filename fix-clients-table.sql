-- Fix clients table to use org_id instead of organization_id
DO $$ 
BEGIN
    -- Check if organization_id column exists and org_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'clients' AND column_name = 'organization_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        -- Rename the column
        ALTER TABLE clients RENAME COLUMN organization_id TO org_id;
        RAISE NOTICE 'Renamed organization_id to org_id';
    
    -- Check if neither column exists
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        -- Add org_id column with default organization
        ALTER TABLE clients 
        ADD COLUMN org_id UUID NOT NULL DEFAULT '63589490-8f55-4157-bd3a-e141594b748e' 
        REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added org_id column';
    ELSE
        RAISE NOTICE 'org_id column already exists';
    END IF;
END $$;