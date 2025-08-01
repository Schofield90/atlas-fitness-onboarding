-- Fix column name mismatches in class_sessions table
DO $$ 
BEGIN
    -- Rename starts_at to start_time if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'class_sessions' 
               AND column_name = 'starts_at') THEN
        ALTER TABLE public.class_sessions RENAME COLUMN starts_at TO start_time;
    END IF;
    
    -- Rename location to room_location if location doesn't exist but room_location does
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'class_sessions' 
               AND column_name = 'room_location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'class_sessions' 
                       AND column_name = 'location') THEN
        ALTER TABLE public.class_sessions RENAME COLUMN room_location TO location;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.class_sessions ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;