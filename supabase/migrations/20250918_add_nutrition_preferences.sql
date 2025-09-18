-- Add preferences and preference completeness to nutrition_profiles
ALTER TABLE nutrition_profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preference_completeness INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN nutrition_profiles.preferences IS 'Stores detailed food preferences collected from AI chat';
COMMENT ON COLUMN nutrition_profiles.preference_completeness IS 'Percentage (0-100) of how complete the preference data is';