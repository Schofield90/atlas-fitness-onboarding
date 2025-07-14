-- Create employees table
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  job_title TEXT NOT NULL,
  annual_salary DECIMAL(10, 2) NOT NULL,
  hours_per_week INTEGER NOT NULL,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  -- Additional fields for Xero integration
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  postcode TEXT NOT NULL,
  national_insurance_number TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  -- Bank details for payment
  bank_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  sort_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create onboarding_sessions table
CREATE TABLE onboarding_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  signature_name TEXT,
  signature_date DATE,
  documents_saved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_onboarding_token ON onboarding_sessions(token);
CREATE INDEX idx_onboarding_expires ON onboarding_sessions(expires_at);
CREATE INDEX idx_employee_email ON employees(email);

-- Create RLS policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- For now, we'll use service role key for admin access
-- You can add more granular policies later