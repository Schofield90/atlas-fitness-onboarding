-- Add client_id column to nutrition_profiles table if it doesn't exist
-- This allows the table to work with both client_id and lead_id

-- Step 1: Check if client_id column already exists, add if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
        
        CREATE INDEX idx_nutrition_profiles_client_id 
        ON nutrition_profiles(client_id) 
        WHERE client_id IS NOT NULL;
        
        RAISE NOTICE 'Added client_id column to nutrition_profiles table';
    ELSE
        RAISE NOTICE 'client_id column already exists in nutrition_profiles table';
    END IF;
END
$$;

-- Step 2: Make lead_id nullable if it isn't already
DO $$
BEGIN
    -- Check if lead_id has NOT NULL constraint
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'lead_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ALTER COLUMN lead_id DROP NOT NULL;
        
        RAISE NOTICE 'Made lead_id column nullable';
    END IF;
END
$$;

-- Step 3: Add check constraint to ensure either client_id or lead_id is set (but not both)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'nutrition_profiles_person_ref_check'
        AND table_name = 'nutrition_profiles'
    ) THEN
        ALTER TABLE nutrition_profiles 
        DROP CONSTRAINT nutrition_profiles_person_ref_check;
    END IF;
    
    -- Add the new constraint
    ALTER TABLE nutrition_profiles 
    ADD CONSTRAINT nutrition_profiles_person_ref_check 
    CHECK (
        (client_id IS NOT NULL AND lead_id IS NULL) OR 
        (client_id IS NULL AND lead_id IS NOT NULL)
    );
    
    RAISE NOTICE 'Added constraint to ensure either client_id or lead_id is set';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists';
END
$$;

-- Step 4: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add sex column (alternative to gender)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'sex'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN sex VARCHAR(10) CHECK (sex IN ('MALE', 'FEMALE', 'OTHER'));
        RAISE NOTICE 'Added sex column';
    END IF;
    
    -- Add height column (alternative to height_cm)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'height'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN height INTEGER CHECK (height > 0 AND height <= 300);
        RAISE NOTICE 'Added height column';
    END IF;
    
    -- Add current_weight column (alternative to weight_kg)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'current_weight'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN current_weight DECIMAL(5,2) CHECK (current_weight > 0 AND current_weight <= 500);
        RAISE NOTICE 'Added current_weight column';
    END IF;
    
    -- Add goal_weight column (alternative to target_weight_kg)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'goal_weight'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN goal_weight DECIMAL(5,2) CHECK (goal_weight > 0 AND goal_weight <= 500);
        RAISE NOTICE 'Added goal_weight column';
    END IF;
    
    -- Add target_protein column (alternative to protein_grams)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'target_protein'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN target_protein INTEGER CHECK (target_protein >= 0);
        RAISE NOTICE 'Added target_protein column';
    END IF;
    
    -- Add target_carbs column (alternative to carbs_grams)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'target_carbs'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN target_carbs INTEGER CHECK (target_carbs >= 0);
        RAISE NOTICE 'Added target_carbs column';
    END IF;
    
    -- Add target_fat column (alternative to fat_grams)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'target_fat'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN target_fat INTEGER CHECK (target_fat >= 0);
        RAISE NOTICE 'Added target_fat column';
    END IF;
    
    -- Add target_fiber column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name = 'target_fiber'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD COLUMN target_fiber INTEGER DEFAULT 25 CHECK (target_fiber >= 0);
        RAISE NOTICE 'Added target_fiber column';
    END IF;
END
$$;

-- Step 5: Update unique constraints
DO $$
BEGIN
    -- Drop old unique constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'nutrition_profiles_lead_id_organization_id_key'
        AND table_name = 'nutrition_profiles'
    ) THEN
        ALTER TABLE nutrition_profiles 
        DROP CONSTRAINT nutrition_profiles_lead_id_organization_id_key;
    END IF;
    
    -- Add new unique constraints
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'nutrition_profiles_unique_client_org'
        AND table_name = 'nutrition_profiles'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD CONSTRAINT nutrition_profiles_unique_client_org 
        UNIQUE(client_id, organization_id);
        RAISE NOTICE 'Added unique constraint for client_id + organization_id';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'nutrition_profiles_unique_lead_org'
        AND table_name = 'nutrition_profiles'
    ) THEN
        ALTER TABLE nutrition_profiles 
        ADD CONSTRAINT nutrition_profiles_unique_lead_org 
        UNIQUE(lead_id, organization_id);
        RAISE NOTICE 'Added unique constraint for lead_id + organization_id';
    END IF;
END
$$;

-- Step 6: Update RLS policies to include client_id
DO $$
BEGIN
    -- Drop and recreate the client view policy
    DROP POLICY IF EXISTS "Clients can view own nutrition profile" ON nutrition_profiles;
    
    CREATE POLICY "Clients can view own nutrition profile" ON nutrition_profiles
    FOR SELECT USING (
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
        lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())
    );
    
    RAISE NOTICE 'Updated RLS policy for client access';
END
$$;

-- Step 7: Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: nutrition_profiles table now supports both client_id and lead_id';
    RAISE NOTICE 'The table can accept profiles linked to either clients or leads';
END
$$;