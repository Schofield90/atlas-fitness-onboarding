-- Improvements for OTP-based account claiming system
-- This migration adds support for better OTP handling

-- Add index on email for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_account_claim_tokens_email 
ON public.account_claim_tokens(email);

-- Add index on client_id and claimed_at for checking unclaimed tokens
CREATE INDEX IF NOT EXISTS idx_account_claim_tokens_client_unclaimed 
ON public.account_claim_tokens(client_id) 
WHERE claimed_at IS NULL;

-- Update RLS policy to allow public to update tokens when claiming (for OTP verification)
DROP POLICY IF EXISTS "Public can claim tokens with valid token" ON public.account_claim_tokens;

CREATE POLICY "Public can view and update tokens for claiming" ON public.account_claim_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to clean up old OTP codes (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_otp_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM public.account_claim_tokens
    WHERE metadata->>'type' = 'otp'
    AND expires_at < NOW() - INTERVAL '1 hour'
    AND claimed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate 6-digit OTP
CREATE OR REPLACE FUNCTION public.generate_otp_code()
RETURNS TEXT AS $$
BEGIN
    -- Generate a 6-digit number between 100000 and 999999
    RETURN LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add constraint to ensure token uniqueness only for unclaimed tokens
-- This allows reusing OTP codes after they've been claimed
DROP INDEX IF EXISTS idx_account_claim_tokens_token;
CREATE UNIQUE INDEX idx_account_claim_tokens_token_unclaimed 
ON public.account_claim_tokens(token) 
WHERE claimed_at IS NULL;

-- Grant necessary permissions for OTP operations
GRANT EXECUTE ON FUNCTION public.generate_otp_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_otp_codes() TO authenticated;

-- Create a scheduled job to clean up old OTP codes (if pg_cron is available)
-- Uncomment these lines if you have pg_cron extension enabled:
-- SELECT cron.schedule(
--     'cleanup-old-otp-codes',
--     '0 * * * *', -- Run every hour
--     'SELECT public.cleanup_old_otp_codes();'
-- );

COMMENT ON FUNCTION public.generate_otp_code() IS 'Generates a 6-digit OTP code for account claiming';
COMMENT ON FUNCTION public.cleanup_old_otp_codes() IS 'Removes expired OTP codes older than 1 hour';
COMMENT ON INDEX idx_account_claim_tokens_email IS 'Speed up OTP lookups by email';
COMMENT ON INDEX idx_account_claim_tokens_token_unclaimed IS 'Ensure uniqueness only for unclaimed tokens, allowing OTP reuse after claiming';