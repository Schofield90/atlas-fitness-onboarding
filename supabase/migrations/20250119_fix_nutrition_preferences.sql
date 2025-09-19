-- Add missing columns to nutrition_profiles if they don't exist
ALTER TABLE nutrition_profiles 
ADD COLUMN IF NOT EXISTS last_preference_update timestamp with time zone,
ADD COLUMN IF NOT EXISTS preference_completeness integer DEFAULT 0;

-- Create preference history table for tracking changes
CREATE TABLE IF NOT EXISTS preference_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
    preferences jsonb,
    change_type text, -- 'initial', 'update', 'ai_learned'
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_preference_history_client ON preference_history(client_id);
CREATE INDEX IF NOT EXISTS idx_preference_history_profile ON preference_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_preference_history_created ON preference_history(created_at DESC);

-- Enable RLS on preference_history
ALTER TABLE preference_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for preference_history
CREATE POLICY "Users can view their own preference history"
    ON preference_history
    FOR SELECT
    USING (
        client_id IN (
            SELECT id FROM clients 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own preference history"
    ON preference_history
    FOR INSERT
    WITH CHECK (
        client_id IN (
            SELECT id FROM clients 
            WHERE user_id = auth.uid()
        )
    );

-- Create a function to get complete preferences
CREATE OR REPLACE FUNCTION get_complete_preferences(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_preferences jsonb;
    v_dietary_preferences jsonb;
    v_result jsonb;
BEGIN
    -- Get the latest preferences from nutrition_profiles
    SELECT 
        preferences,
        dietary_preferences
    INTO 
        v_preferences,
        v_dietary_preferences
    FROM nutrition_profiles
    WHERE client_id = p_client_id
    LIMIT 1;
    
    -- Merge all preference sources
    v_result := COALESCE(v_preferences, '{}'::jsonb) || COALESCE(v_dietary_preferences, '{}'::jsonb);
    
    -- Add completeness calculation
    v_result := v_result || jsonb_build_object(
        'completeness', calculate_preference_completeness(v_result),
        'last_updated', CURRENT_TIMESTAMP
    );
    
    RETURN v_result;
END;
$$;

-- Create a function to calculate preference completeness
CREATE OR REPLACE FUNCTION calculate_preference_completeness(preferences jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    required_fields text[] := ARRAY[
        'dietary_restrictions',
        'allergies',
        'favorite_foods',
        'disliked_foods',
        'meal_timings',
        'cooking_skill',
        'time_availability',
        'kitchen_equipment',
        'cultural_preferences',
        'specific_goals'
    ];
    field text;
    field_value jsonb;
    filled_count integer := 0;
    total_count integer;
BEGIN
    total_count := array_length(required_fields, 1);
    
    FOREACH field IN ARRAY required_fields
    LOOP
        field_value := preferences->field;
        
        IF field_value IS NOT NULL AND field_value != 'null'::jsonb THEN
            -- Check if array has items or object has keys
            IF jsonb_typeof(field_value) = 'array' THEN
                IF jsonb_array_length(field_value) > 0 THEN
                    filled_count := filled_count + 1;
                END IF;
            ELSIF jsonb_typeof(field_value) = 'object' THEN
                IF (SELECT COUNT(*) FROM jsonb_object_keys(field_value)) > 0 THEN
                    filled_count := filled_count + 1;
                END IF;
            ELSIF field_value::text != '""' AND field_value::text != 'null' THEN
                filled_count := filled_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN ROUND((filled_count::numeric / total_count::numeric) * 100);
END;
$$;

-- Create a trigger to update preference completeness automatically
CREATE OR REPLACE FUNCTION update_preference_completeness()
RETURNS TRIGGER AS $$
BEGIN
    NEW.preference_completeness := calculate_preference_completeness(
        COALESCE(NEW.preferences, '{}'::jsonb) || 
        COALESCE(NEW.dietary_preferences, '{}'::jsonb)
    );
    NEW.last_preference_update := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic completeness updates
DROP TRIGGER IF EXISTS update_preference_completeness_trigger ON nutrition_profiles;
CREATE TRIGGER update_preference_completeness_trigger
    BEFORE INSERT OR UPDATE OF preferences, dietary_preferences
    ON nutrition_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_preference_completeness();

-- Update existing profiles to calculate completeness
UPDATE nutrition_profiles
SET preference_completeness = calculate_preference_completeness(
    COALESCE(preferences, '{}'::jsonb) || 
    COALESCE(dietary_preferences, '{}'::jsonb)
)
WHERE preference_completeness IS NULL OR preference_completeness = 0;