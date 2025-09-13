-- Add metadata column to programs table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.programs.metadata IS 'Additional program settings including location, instructor types, and category';

-- Migrate any existing location data if there's a location column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'programs' 
               AND column_name = 'location') THEN
        UPDATE public.programs 
        SET metadata = jsonb_set(
            COALESCE(metadata, '{}'), 
            '{location}', 
            to_jsonb(location)
        )
        WHERE location IS NOT NULL;
    END IF;
END $$;