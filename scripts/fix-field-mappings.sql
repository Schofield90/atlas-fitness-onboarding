-- Fix the incorrect field_mappings structure for the latest migration job
-- The current structure has nested metadata which is incorrect

-- First, let's check the current field_mappings
SELECT 
  id,
  field_mappings,
  status,
  created_at
FROM migration_jobs 
WHERE id = '867ddebc-6878-4b5e-9f05-f84ab7d39271';

-- Update the field_mappings to the correct flat structure
-- Based on the CSV headers from the migration_files table
UPDATE migration_jobs
SET field_mappings = jsonb_build_object(
  'First Name', 'first_name',
  'Last Name', 'last_name',
  'Email', 'email',
  'Phone', 'phone',
  'DOB', 'date_of_birth',
  'Address Line 1', 'address',
  'Address Line 2', 'address_line_2',
  'City', 'city',
  'Postcode', 'postcode',
  'Country', 'country',
  'Emergency Contact Name', 'emergency_contact_name',
  'Emergency Contact Phone', 'emergency_contact_phone',
  'Explanation', 'notes'
),
status = 'ready' -- Reset status to allow re-processing
WHERE id = '867ddebc-6878-4b5e-9f05-f84ab7d39271';

-- Verify the update
SELECT 
  id,
  field_mappings,
  status
FROM migration_jobs 
WHERE id = '867ddebc-6878-4b5e-9f05-f84ab7d39271';

-- Clear any failed migration records to allow retry
DELETE FROM migration_records
WHERE migration_job_id = '867ddebc-6878-4b5e-9f05-f84ab7d39271';

-- Clear any migration logs for this job to start fresh
DELETE FROM migration_logs
WHERE migration_job_id = '867ddebc-6878-4b5e-9f05-f84ab7d39271';

-- Update migration_field_mappings as well if they exist
DELETE FROM migration_field_mappings
WHERE migration_job_id = '867ddebc-6878-4b5e-9f05-f84ab7d39271';

-- Insert correct field mappings
INSERT INTO migration_field_mappings (
  migration_job_id,
  organization_id,
  source_field,
  target_field,
  target_table,
  ai_confidence
) VALUES
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'First Name', 'first_name', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'Last Name', 'last_name', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'Email', 'email', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'Phone', 'phone', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'DOB', 'date_of_birth', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'Address Line 1', 'address', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'City', 'city', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'Postcode', 'postcode', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'Country', 'country', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'Emergency Contact Name', 'emergency_contact_name', 'clients', 0.9),
  ('867ddebc-6878-4b5e-9f05-f84ab7d39271', '63589490-8f55-4157-bd3a-e141594b748e', 'Emergency Contact Phone', 'emergency_contact_phone', 'clients', 0.9);