-- Fix account_claim_tokens table to make expires_at optional
ALTER TABLE public.account_claim_tokens 
ALTER COLUMN expires_at DROP NOT NULL;

-- Add secure RPC function to validate claim tokens
CREATE OR REPLACE FUNCTION public.rpc_validate_claim_token(p_token TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    email TEXT,
    client_id UUID,
    organization_id UUID,
    first_name TEXT,
    last_name TEXT,
    phone TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_record RECORD;
    v_client_record RECORD;
BEGIN
    -- Find the token
    SELECT t.*, c.first_name, c.last_name, c.phone, c.email as client_email
    INTO v_token_record
    FROM public.account_claim_tokens t
    LEFT JOIN public.clients c ON c.id = t.client_id
    WHERE t.token = p_token
    LIMIT 1;
    
    -- Check if token exists
    IF v_token_record.id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN as is_valid,
            NULL::TEXT as email,
            NULL::UUID as client_id,
            NULL::UUID as organization_id,
            NULL::TEXT as first_name,
            NULL::TEXT as last_name,
            NULL::TEXT as phone;
        RETURN;
    END IF;
    
    -- Check if already claimed
    IF v_token_record.claimed_at IS NOT NULL THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN as is_valid,
            v_token_record.email,
            v_token_record.client_id,
            v_token_record.organization_id,
            v_token_record.first_name,
            v_token_record.last_name,
            v_token_record.phone;
        RETURN;
    END IF;
    
    -- Check if expired (only if expires_at is set)
    IF v_token_record.expires_at IS NOT NULL AND v_token_record.expires_at < NOW() THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN as is_valid,
            v_token_record.email,
            v_token_record.client_id,
            v_token_record.organization_id,
            v_token_record.first_name,
            v_token_record.last_name,
            v_token_record.phone;
        RETURN;
    END IF;
    
    -- Token is valid
    RETURN QUERY SELECT 
        TRUE::BOOLEAN as is_valid,
        v_token_record.email,
        v_token_record.client_id,
        v_token_record.organization_id,
        v_token_record.first_name,
        v_token_record.last_name,
        v_token_record.phone;
END;
$$;

-- Grant execute permission to anon for the RPC function
GRANT EXECUTE ON FUNCTION public.rpc_validate_claim_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_validate_claim_token(TEXT) TO authenticated;

-- Add RLS policies for clients table (for self-serve flow)
CREATE POLICY "clients_self_access" 
ON public.clients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "clients_self_update" 
ON public.clients 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure public can read clients with valid claim tokens (already exists but let's make it idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clients' 
        AND policyname = 'Public can read for claim tokens'
    ) THEN
        CREATE POLICY "Public can read for claim tokens" 
        ON public.clients
        FOR SELECT
        TO anon, public
        USING (
            id IN (
                SELECT client_id 
                FROM public.account_claim_tokens 
                WHERE claimed_at IS NULL
            )
        );
    END IF;
END $$;

-- Add index on clients.user_id for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Add logging for claim attempts
CREATE TABLE IF NOT EXISTS public.claim_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT,
    client_id UUID REFERENCES public.clients(id),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_attempts_token ON public.claim_attempts(token);
CREATE INDEX IF NOT EXISTS idx_claim_attempts_created_at ON public.claim_attempts(created_at);

-- Function to log claim attempts
CREATE OR REPLACE FUNCTION public.log_claim_attempt(
    p_token TEXT,
    p_client_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.claim_attempts (token, client_id, success, error_message, ip_address, user_agent)
    VALUES (p_token, p_client_id, p_success, p_error_message, p_ip_address, p_user_agent)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_claim_attempt(TEXT, UUID, BOOLEAN, TEXT, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_claim_attempt(TEXT, UUID, BOOLEAN, TEXT, INET, TEXT) TO authenticated;