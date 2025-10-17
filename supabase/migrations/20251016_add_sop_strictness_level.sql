-- Add strictness_level column to sops table
-- Allows setting how strictly SOPs should be followed: exact_script, guideline, or general_tone

ALTER TABLE sops
ADD COLUMN IF NOT EXISTS strictness_level TEXT DEFAULT 'guideline'
CHECK (strictness_level IN ('exact_script', 'guideline', 'general_tone'));

-- Add comment explaining the levels
COMMENT ON COLUMN sops.strictness_level IS 'exact_script: Copy word-for-word | guideline: Follow closely but allow adaptation | general_tone: Use as general guidance only';

-- Update existing SOPs with appropriate strictness levels
-- First 3 messages should be exact scripts
UPDATE sops SET strictness_level = 'exact_script' WHERE name LIKE 'First message%';
UPDATE sops SET strictness_level = 'exact_script' WHERE name LIKE 'Second message%';
UPDATE sops SET strictness_level = 'exact_script' WHERE name LIKE 'Third message%';

-- Tone SOP should be general guidance
UPDATE sops SET strictness_level = 'general_tone' WHERE name LIKE '%Tone%';

-- Pricing and booking can be guidelines
UPDATE sops SET strictness_level = 'guideline' WHERE name LIKE '%price%';
UPDATE sops SET strictness_level = 'guideline' WHERE name LIKE '%Book%';
