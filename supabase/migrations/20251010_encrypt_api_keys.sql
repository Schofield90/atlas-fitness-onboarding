-- Migration: Encrypt existing API keys and add security columns
-- Date: October 10, 2025
-- Priority: CRITICAL - Run immediately

-- Add new columns for encrypted storage
ALTER TABLE stripe_connect_accounts
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS access_token_mask VARCHAR(50),
  ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(10),
  ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rotation_reminder_sent BOOLEAN DEFAULT FALSE;

-- Add similar columns to payment_provider_accounts for GoCardless
ALTER TABLE payment_provider_accounts
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS access_token_mask VARCHAR(50),
  ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(10),
  ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rotation_reminder_sent BOOLEAN DEFAULT FALSE;

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- Create function to track API key access
CREATE OR REPLACE FUNCTION log_api_key_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when access_token is accessed
  IF (TG_OP = 'SELECT' OR TG_OP = 'UPDATE') AND OLD.access_token IS DISTINCT FROM NEW.access_token THEN
    INSERT INTO audit_logs (
      organization_id,
      action,
      resource_type,
      resource_id,
      metadata,
      created_at
    ) VALUES (
      NEW.organization_id,
      'api_key_accessed',
      TG_TABLE_NAME,
      NEW.id::TEXT,
      jsonb_build_object(
        'operation', TG_OP,
        'encrypted', NEW.encryption_version IS NOT NULL
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow reading audit logs for own organization
CREATE POLICY "Users can view own organization audit logs" ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff
      WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations
      WHERE owner_id = auth.uid()
    )
  );

-- Create webhook_verifications table for signature validation
CREATE TABLE IF NOT EXISTS webhook_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(50) NOT NULL, -- 'stripe', 'gocardless', etc
  webhook_id TEXT NOT NULL,
  signature TEXT,
  verified BOOLEAN DEFAULT FALSE,
  payload_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, webhook_id)
);

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_webhook_verifications_provider ON webhook_verifications(provider, created_at DESC);

-- Create payment_validations table for amount verification
CREATE TABLE IF NOT EXISTS payment_validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  payment_intent_id TEXT,
  expected_amount INTEGER NOT NULL,
  received_amount INTEGER NOT NULL,
  validation_status VARCHAR(20), -- 'valid', 'mismatch', 'suspicious'
  membership_plan_id UUID REFERENCES membership_plans(id),
  client_id UUID REFERENCES clients(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for payment validation queries
CREATE INDEX IF NOT EXISTS idx_payment_validations_org ON payment_validations(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_validations_status ON payment_validations(validation_status, created_at DESC);

-- Alert table for security incidents
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  alert_type VARCHAR(50) NOT NULL, -- 'api_key_exposed', 'payment_mismatch', etc
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for alert queries
CREATE INDEX IF NOT EXISTS idx_security_alerts_org ON security_alerts(organization_id, acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity, acknowledged, created_at DESC);

-- Function to detect suspicious payment amounts
CREATE OR REPLACE FUNCTION validate_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  expected_amount INTEGER;
  plan_record RECORD;
BEGIN
  -- Only validate for new payments
  IF TG_OP = 'INSERT' THEN
    -- Get the expected amount from membership plan
    IF NEW.metadata->>'membership_id' IS NOT NULL THEN
      SELECT price_monthly * 100 INTO expected_amount
      FROM membership_plans
      WHERE id = (NEW.metadata->>'membership_id')::UUID;

      -- Check if amount matches
      IF expected_amount IS NOT NULL AND NEW.amount != expected_amount THEN
        -- Log the mismatch
        INSERT INTO payment_validations (
          organization_id,
          payment_intent_id,
          expected_amount,
          received_amount,
          validation_status,
          membership_plan_id,
          client_id,
          metadata
        ) VALUES (
          NEW.organization_id,
          NEW.provider_payment_id,
          expected_amount,
          NEW.amount,
          'mismatch',
          (NEW.metadata->>'membership_id')::UUID,
          NEW.client_id,
          NEW.metadata
        );

        -- Create security alert for large discrepancies
        IF ABS(NEW.amount - expected_amount) > 1000 THEN -- More than £10 difference
          INSERT INTO security_alerts (
            organization_id,
            alert_type,
            severity,
            title,
            description,
            metadata
          ) VALUES (
            NEW.organization_id,
            'payment_mismatch',
            'high',
            'Suspicious Payment Amount Detected',
            format('Payment amount £%s does not match expected £%s for membership plan',
              NEW.amount/100.0, expected_amount/100.0),
            jsonb_build_object(
              'payment_id', NEW.id,
              'expected_amount', expected_amount,
              'received_amount', NEW.amount,
              'client_id', NEW.client_id
            )
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment validation
DROP TRIGGER IF EXISTS validate_payment_amounts ON payments;
CREATE TRIGGER validate_payment_amounts
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_amount();

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all security-sensitive operations';
COMMENT ON TABLE webhook_verifications IS 'Track webhook signature verification to prevent forgery';
COMMENT ON TABLE payment_validations IS 'Validate payment amounts against expected values';
COMMENT ON TABLE security_alerts IS 'Security incidents requiring immediate attention';

COMMENT ON COLUMN stripe_connect_accounts.access_token IS 'DEPRECATED - Contains unencrypted API keys. Migrate to access_token_encrypted';
COMMENT ON COLUMN stripe_connect_accounts.access_token_encrypted IS 'Encrypted API key using AES-256-GCM';
COMMENT ON COLUMN stripe_connect_accounts.access_token_mask IS 'Masked version of API key for display (e.g., sk_live_****xyz)';

-- IMPORTANT: After this migration, you must:
-- 1. Run the encryption script to migrate existing keys
-- 2. Update all code to use the new encrypted fields
-- 3. Delete the unencrypted access_token column after verification
-- 4. Implement key rotation policy (90 days recommended)