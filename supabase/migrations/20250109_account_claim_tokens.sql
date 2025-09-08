-- Create account_claim_tokens table for magic link authentication
CREATE TABLE IF NOT EXISTS public.account_claim_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_account_claim_tokens_token ON public.account_claim_tokens(token);
CREATE INDEX idx_account_claim_tokens_client_id ON public.account_claim_tokens(client_id);
CREATE INDEX idx_account_claim_tokens_expires_at ON public.account_claim_tokens(expires_at);
CREATE INDEX idx_account_claim_tokens_organization_id ON public.account_claim_tokens(organization_id);

-- Enable RLS
ALTER TABLE public.account_claim_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_claim_tokens
-- Organizations can create and view their own tokens
CREATE POLICY "Organizations can manage their claim tokens" ON public.account_claim_tokens
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Public can view and claim tokens using the token itself (for the claim process)
CREATE POLICY "Public can claim tokens with valid token" ON public.account_claim_tokens
    FOR SELECT
    USING (true);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_claim_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM public.account_claim_tokens
    WHERE expires_at < NOW() AND claimed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate a secure random token
CREATE OR REPLACE FUNCTION public.generate_claim_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a URL-safe random token (32 characters)
    token := encode(gen_random_bytes(24), 'base64');
    -- Replace URL-unsafe characters
    token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON public.account_claim_tokens TO authenticated;
GRANT SELECT ON public.account_claim_tokens TO anon;