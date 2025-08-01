-- Multi-Tenant Updates for Client Portal

-- Add slug field to organizations for URL routing
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE;

-- Add branding fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "booking": true,
  "referrals": true,
  "coaching": true,
  "ai_insights": true
}'::jsonb;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Update existing organizations to have slugs (you'll need to run this manually with appropriate values)
-- UPDATE organizations SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g')) WHERE slug IS NULL;

-- Add organization-specific settings for client portal
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS client_portal_settings JSONB DEFAULT '{
  "booking_advance_hours": 24,
  "cancellation_hours": 24,
  "max_bookings_per_day": 2,
  "referral_rewards": {
    "referrer_type": "credit",
    "referrer_amount": 10,
    "referee_type": "discount",
    "referee_amount": 20
  },
  "payment_methods": ["card"],
  "currencies": ["GBP"],
  "timezone": "Europe/London"
}'::jsonb;

-- Ensure all client-related tables have organization_id foreign keys
-- (Already done in previous migration, but ensuring consistency)

-- Create function to validate organization access
CREATE OR REPLACE FUNCTION user_has_organization_access(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id AND organization_id = org_id
  ) OR EXISTS (
    SELECT 1 FROM clients 
    WHERE id = user_id AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for client sessions to ensure organization isolation
DROP POLICY IF EXISTS "Clients can view their own sessions" ON client_sessions;
CREATE POLICY "Clients can view their own sessions" ON client_sessions
    FOR SELECT USING (
      client_id = auth.uid() AND 
      user_has_organization_access(auth.uid(), organization_id)
    );

DROP POLICY IF EXISTS "Staff can view all sessions in their organization" ON client_sessions;
CREATE POLICY "Staff can view organization sessions" ON client_sessions
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    );

-- Update available_slots policies for organization isolation
DROP POLICY IF EXISTS "Everyone can view available slots" ON available_slots;
CREATE POLICY "View available slots by organization" ON available_slots
    FOR SELECT USING (
      is_available = TRUE AND (
        -- Public access for non-authenticated users based on org context
        auth.uid() IS NULL OR
        -- Authenticated users can see their organization's slots
        user_has_organization_access(auth.uid(), organization_id)
      )
    );

-- Add organization-specific payment settings
CREATE TABLE IF NOT EXISTS organization_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Stripe Connect
  stripe_account_id VARCHAR,
  stripe_account_status VARCHAR DEFAULT 'pending',
  stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- Payment configuration
  platform_fee_percentage DECIMAL(5,2) DEFAULT 3.00,
  currency VARCHAR DEFAULT 'GBP',
  
  -- Payment methods accepted
  accept_card BOOLEAN DEFAULT TRUE,
  accept_bank_transfer BOOLEAN DEFAULT FALSE,
  accept_cash BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- Create index for payment settings
CREATE INDEX IF NOT EXISTS idx_org_payment_settings_org_id ON organization_payment_settings(organization_id);

-- Enable RLS on payment settings
ALTER TABLE organization_payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment settings
CREATE POLICY "Org admins can view payment settings" ON organization_payment_settings
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

CREATE POLICY "Org admins can update payment settings" ON organization_payment_settings
    FOR UPDATE USING (
      organization_id IN (
        SELECT organization_id FROM users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

-- Add customizable email templates per organization
CREATE TABLE IF NOT EXISTS organization_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  template_type VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, template_type)
);

-- Create index for email templates
CREATE INDEX IF NOT EXISTS idx_org_email_templates ON organization_email_templates(organization_id, template_type);

-- Sample template types
COMMENT ON COLUMN organization_email_templates.template_type IS 'booking_confirmation, booking_reminder, booking_cancelled, referral_invite, welcome_email';

-- Update triggers
CREATE TRIGGER update_org_payment_settings_updated_at BEFORE UPDATE ON organization_payment_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_org_email_templates_updated_at BEFORE UPDATE ON organization_email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();