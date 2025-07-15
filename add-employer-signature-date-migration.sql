-- Add employer signature date column to employees table
ALTER TABLE employees 
ADD COLUMN employer_signature_date DATE;

-- Update existing records to have today's date as default
UPDATE employees SET employer_signature_date = CURRENT_DATE WHERE employer_signature_date IS NULL;