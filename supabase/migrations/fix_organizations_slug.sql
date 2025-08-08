-- Fix organizations table slug column issue
-- Run this in Supabase SQL Editor if you get "column slug does not exist" error

-- First, check if organizations table exists
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations'
    ) THEN
        -- Check if slug column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'organizations' 
            AND column_name = 'slug'
        ) THEN
            -- Add the slug column
            ALTER TABLE organizations ADD COLUMN slug TEXT;
            
            -- Generate slugs from existing names
            UPDATE organizations 
            SET slug = LOWER(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
                    '\s+', '-', 'g'
                )
            )
            WHERE slug IS NULL;
            
            -- Make slug required and unique
            ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;
            ALTER TABLE organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
            ALTER TABLE organizations ADD CONSTRAINT organizations_slug_check 
                CHECK (slug ~ '^[a-z0-9-]+$');
            
            RAISE NOTICE 'Successfully added slug column to organizations table';
        ELSE
            RAISE NOTICE 'Slug column already exists in organizations table';
        END IF;
    ELSE
        RAISE NOTICE 'Organizations table does not exist - you need to run the full migration';
    END IF;
END $$;