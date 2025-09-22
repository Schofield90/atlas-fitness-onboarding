-- Add password field to clients table for optional password authentication
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Create index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_clients_password_reset_token
ON clients(password_reset_token)
WHERE password_reset_token IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN clients.password_hash IS 'Bcrypt hashed password for clients who prefer password login over OTP';
COMMENT ON COLUMN clients.password_set_at IS 'Timestamp when password was last set/changed';
COMMENT ON COLUMN clients.password_reset_token IS 'Token for password reset functionality';
COMMENT ON COLUMN clients.password_reset_expires IS 'Expiration time for password reset token';