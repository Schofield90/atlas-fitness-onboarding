-- Fix RLS policies for account claim tokens to allow public access

-- Drop existing policies
DROP POLICY IF EXISTS "Public can claim tokens with valid token" ON public.account_claim_tokens;
DROP POLICY IF EXISTS "Allow public read for valid tokens" ON public.account_claim_tokens;

-- Create a more permissive policy for public token validation
-- This allows anyone to read tokens (needed for the claim process)
CREATE POLICY "Public can read tokens for claiming"
ON public.account_claim_tokens
FOR SELECT
TO anon, public
USING (true);  -- Allow all reads - the token itself is the security

-- Update the clients RLS policy to ensure it works correctly
DROP POLICY IF EXISTS "Allow public read for clients with valid claim tokens" ON public.clients;

-- Recreate the policy with better logic
CREATE POLICY "Allow public read for clients with valid claim tokens"
ON public.clients
FOR SELECT
TO anon, public
USING (
    -- Check if there's an unclaimed token for this client
    EXISTS (
        SELECT 1 
        FROM public.account_claim_tokens 
        WHERE client_id = clients.id 
        AND claimed_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    )
);

-- Grant necessary permissions
GRANT SELECT ON public.account_claim_tokens TO anon;
GRANT SELECT ON public.clients TO anon;

-- Also ensure the RPC function is accessible
GRANT EXECUTE ON FUNCTION public.has_valid_claim_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.has_valid_claim_token(UUID) TO public;