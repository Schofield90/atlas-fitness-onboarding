-- Remove all claim-related tables and functions

-- Drop the account_claim_tokens table and related objects
DROP TABLE IF EXISTS account_claim_tokens CASCADE;

-- Create a simple OTP tokens table for login
CREATE TABLE IF NOT EXISTS otp_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- Add index for quick lookups
CREATE INDEX idx_otp_tokens_email_token ON otp_tokens(email, token);
CREATE INDEX idx_otp_tokens_expires_at ON otp_tokens(expires_at);

-- Enable RLS
ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role only (no user access needed)
CREATE POLICY "Service role can manage OTP tokens" ON otp_tokens
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Clean up expired tokens automatically
CREATE OR REPLACE FUNCTION clean_expired_otp_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update clients table to ensure user_id is set on creation
-- Remove any claim-related columns if they exist
ALTER TABLE clients 
  DROP COLUMN IF EXISTS claim_token,
  DROP COLUMN IF EXISTS claimed_at,
  DROP COLUMN IF EXISTS is_claimed;

-- Create function to auto-create auth user when client is created
CREATE OR REPLACE FUNCTION auto_create_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Only create auth user if email is provided and user_id is not set
  IF NEW.email IS NOT NULL AND NEW.user_id IS NULL THEN
    -- Insert into auth.users (this will be done via the API in practice)
    -- For now, just return NEW as the actual user creation happens in the API
    -- This function serves as documentation of the intended behavior
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The actual auth user creation will happen in the API routes
-- This migration just cleans up the database structure