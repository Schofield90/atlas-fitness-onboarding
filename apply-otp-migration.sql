-- OTP System Migration
-- Run this SQL in Supabase SQL Editor to enable OTP-based account claiming

-- First, ensure the account_claim_tokens table exists and has the right structure
-- Check if expires_at is nullable (for permanent tokens)
DO $$ 
BEGIN
    -- Make expires_at nullable if it isn't already
    ALTER TABLE account_claim_tokens 
    ALTER COLUMN expires_at DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        -- Column might already be nullable
        NULL;
END $$;

-- Add indexes for better OTP performance
CREATE INDEX IF NOT EXISTS idx_account_claim_tokens_email 
ON public.account_claim_tokens(email);

CREATE INDEX IF NOT EXISTS idx_account_claim_tokens_client_unclaimed 
ON public.account_claim_tokens(client_id) 
WHERE claimed_at IS NULL;

-- Update RLS to allow public access for OTP claiming
DROP POLICY IF EXISTS "Public can claim tokens with valid token" ON public.account_claim_tokens;
DROP POLICY IF EXISTS "Public can view and update tokens for claiming" ON public.account_claim_tokens;

CREATE POLICY "Public can view and update tokens for claiming" ON public.account_claim_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Ensure uniqueness only for unclaimed tokens (allows OTP reuse after claiming)
DROP INDEX IF EXISTS idx_account_claim_tokens_token;
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_claim_tokens_token_unclaimed 
ON public.account_claim_tokens(token) 
WHERE claimed_at IS NULL;

-- Clean up any duplicate unclaimed tokens for the same client
-- Keep only the most recent one
DELETE FROM account_claim_tokens a
WHERE claimed_at IS NULL
AND EXISTS (
    SELECT 1 
    FROM account_claim_tokens b 
    WHERE b.client_id = a.client_id 
    AND b.claimed_at IS NULL 
    AND b.created_at > a.created_at
);

-- Verify the changes
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) FILTER (WHERE claimed_at IS NULL) as unclaimed_tokens,
    COUNT(*) FILTER (WHERE claimed_at IS NOT NULL) as claimed_tokens,
    COUNT(DISTINCT client_id) as unique_clients
FROM account_claim_tokens;

-- Show sample of recent tokens
SELECT 
    id,
    email,
    token,
    CASE 
        WHEN LENGTH(token) = 6 AND token ~ '^\d+$' THEN 'OTP'
        ELSE 'Magic Link Token'
    END as token_type,
    expires_at,
    claimed_at,
    created_at
FROM account_claim_tokens
ORDER BY created_at DESC
LIMIT 5;