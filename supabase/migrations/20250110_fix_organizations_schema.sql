-- Fix organizations table schema to remove non-existent columns
-- and ensure settings and metadata are JSONB columns

-- Step 1: Drop columns that shouldn't exist (if they somehow do)
DO $$
BEGIN
    -- Drop features column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'features'
    ) THEN
        ALTER TABLE organizations DROP COLUMN features;
        RAISE NOTICE 'Dropped features column from organizations table';
    END IF;
    
    -- Drop type column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE organizations DROP COLUMN type;
        RAISE NOTICE 'Dropped type column from organizations table';
    END IF;
    
    -- Drop owner_id column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE organizations DROP COLUMN owner_id;
        RAISE NOTICE 'Dropped owner_id column from organizations table';
    END IF;
END
$$;

-- Step 2: Ensure settings column exists and is JSONB
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'settings'
    ) THEN
        ALTER TABLE organizations 
        ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added settings column to organizations table';
    ELSE
        -- Ensure it's JSONB type
        IF (SELECT data_type FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'settings') != 'jsonb' THEN
            ALTER TABLE organizations 
            ALTER COLUMN settings TYPE JSONB USING settings::jsonb;
            RAISE NOTICE 'Converted settings column to JSONB';
        END IF;
    END IF;
END
$$;

-- Step 3: Ensure metadata column exists and is JSONB
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE organizations 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added metadata column to organizations table';
    ELSE
        -- Ensure it's JSONB type
        IF (SELECT data_type FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'metadata') != 'jsonb' THEN
            ALTER TABLE organizations 
            ALTER COLUMN metadata TYPE JSONB USING metadata::jsonb;
            RAISE NOTICE 'Converted metadata column to JSONB';
        END IF;
    END IF;
END
$$;

-- Step 4: Create indexes for JSONB columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'organizations' 
        AND indexname = 'idx_organizations_settings'
    ) THEN
        CREATE INDEX idx_organizations_settings ON organizations USING gin (settings);
        RAISE NOTICE 'Created index on settings column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'organizations' 
        AND indexname = 'idx_organizations_metadata'
    ) THEN
        CREATE INDEX idx_organizations_metadata ON organizations USING gin (metadata);
        RAISE NOTICE 'Created index on metadata column';
    END IF;
END
$$;

-- Step 5: Force PostgREST schema cache reload
-- This notifies PostgREST that the schema has changed
DO $$
BEGIN
    -- Send notification to PostgREST to reload schema
    NOTIFY pgrst, 'reload schema';
    RAISE NOTICE 'Sent schema reload notification to PostgREST';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not send schema reload notification: %', SQLERRM;
END
$$;

-- Step 6: Log the final structure
DO $$
DECLARE
    col_record RECORD;
    col_list TEXT := '';
BEGIN
    FOR col_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'organizations'
        ORDER BY ordinal_position
    LOOP
        col_list := col_list || E'\n  - ' || col_record.column_name || ' (' || col_record.data_type || ')';
    END LOOP;
    
    RAISE NOTICE 'Organizations table structure:%', col_list;
    RAISE NOTICE 'Migration completed successfully';
END
$$;