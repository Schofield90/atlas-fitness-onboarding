-- Add employer signature column to employees table
ALTER TABLE employees 
ADD COLUMN employer_signature_url TEXT,
ADD COLUMN employer_name TEXT DEFAULT 'Sam Schofield';

-- Update existing records to have the default employer name
UPDATE employees SET employer_name = 'Sam Schofield' WHERE employer_name IS NULL;