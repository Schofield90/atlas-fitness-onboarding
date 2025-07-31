-- Check if columns exist and add missing ones
DO $$ 
BEGIN
    -- Add capacity column if it doesn't exist (alias for max_capacity)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'capacity') THEN
        ALTER TABLE public.class_sessions ADD COLUMN capacity INTEGER DEFAULT 20;
        
        -- Copy data from max_capacity if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'max_capacity') THEN
            UPDATE public.class_sessions SET capacity = max_capacity WHERE capacity IS NULL;
        END IF;
    END IF;
    
    -- Add instructor_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'instructor_name') THEN
        ALTER TABLE public.class_sessions ADD COLUMN instructor_name VARCHAR(255);
    END IF;
    
    -- Add price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'price') THEN
        ALTER TABLE public.class_sessions ADD COLUMN price INTEGER DEFAULT 0;
    END IF;
    
    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'location') THEN
        ALTER TABLE public.class_sessions ADD COLUMN location VARCHAR(255) DEFAULT 'Main Studio';
    END IF;
    
    -- Add duration_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'duration_minutes') THEN
        ALTER TABLE public.class_sessions ADD COLUMN duration_minutes INTEGER DEFAULT 60;
        
        -- Try to calculate from end_time - start_time if those exist
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'end_time') THEN
            UPDATE public.class_sessions 
            SET duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time))/60 
            WHERE duration_minutes IS NULL AND end_time IS NOT NULL AND start_time IS NOT NULL;
        END IF;
    END IF;
    
    -- Add recurring column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'recurring') THEN
        ALTER TABLE public.class_sessions ADD COLUMN recurring BOOLEAN DEFAULT false;
    END IF;
    
    -- Add day_of_week column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'class_sessions' 
                   AND column_name = 'day_of_week') THEN
        ALTER TABLE public.class_sessions ADD COLUMN day_of_week INTEGER;
    END IF;
END $$;