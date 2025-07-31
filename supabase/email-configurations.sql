-- Email Configurations Table
CREATE TABLE IF NOT EXISTS email_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('shared', 'dedicated')),
  
  -- Shared server settings
  subdomain TEXT UNIQUE,
  shared_domain TEXT DEFAULT 'mail.gymleadhub.com',
  
  -- Dedicated server settings
  custom_domain TEXT,
  dns_verified BOOLEAN DEFAULT false,
  dns_records JSONB,
  dns_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Email settings
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to_email TEXT,
  
  -- API settings
  resend_api_key TEXT, -- Only for dedicated servers
  daily_limit INTEGER DEFAULT 100, -- For shared servers
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  setup_completed BOOLEAN DEFAULT false,
  setup_step INTEGER DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- Create indexes
CREATE INDEX idx_email_configurations_organization ON email_configurations(organization_id);
CREATE INDEX idx_email_configurations_subdomain ON email_configurations(subdomain);
CREATE INDEX idx_email_configurations_custom_domain ON email_configurations(custom_domain);

-- Enable RLS
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their organization's email configuration" ON email_configurations
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update their organization's email configuration" ON email_configurations
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can insert email configuration for their organization" ON email_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

-- Email Usage Logs Table
CREATE TABLE IF NOT EXISTS email_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_configuration_id UUID NOT NULL REFERENCES email_configurations(id) ON DELETE CASCADE,
  
  -- Email details
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  template_id UUID,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'complained', 'delivered')),
  error_message TEXT,
  
  -- Provider details
  provider_message_id TEXT,
  provider_response JSONB,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_email_usage_logs_organization ON email_usage_logs(organization_id);
CREATE INDEX idx_email_usage_logs_configuration ON email_usage_logs(email_configuration_id);
CREATE INDEX idx_email_usage_logs_status ON email_usage_logs(status);
CREATE INDEX idx_email_usage_logs_sent_at ON email_usage_logs(sent_at);

-- Enable RLS
ALTER TABLE email_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_usage_logs
CREATE POLICY "Users can view their organization's email logs" ON email_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System can insert email logs" ON email_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Will be restricted by API

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('marketing', 'transactional', 'automation', 'general')),
  
  -- Content
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  
  -- Variables
  variables JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(organization_id, name)
);

-- Create indexes
CREATE INDEX idx_email_templates_organization ON email_templates(organization_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "Users can view their organization's email templates" ON email_templates
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create email templates for their organization" ON email_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update their organization's email templates" ON email_templates
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete their organization's email templates" ON email_templates
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

-- Function to generate unique subdomain
CREATE OR REPLACE FUNCTION generate_unique_subdomain(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_subdomain TEXT;
  final_subdomain TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base subdomain from organization name
  base_subdomain := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Ensure minimum length
  IF length(base_subdomain) < 3 THEN
    base_subdomain := base_subdomain || 'gym';
  END IF;
  
  final_subdomain := base_subdomain;
  
  -- Check for uniqueness and add number if needed
  WHILE EXISTS (SELECT 1 FROM email_configurations WHERE subdomain = final_subdomain) LOOP
    counter := counter + 1;
    final_subdomain := base_subdomain || counter::text;
  END LOOP;
  
  RETURN final_subdomain;
END;
$$ LANGUAGE plpgsql;

-- Function to check daily email limit
CREATE OR REPLACE FUNCTION check_email_limit(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_service_type TEXT;
  v_daily_limit INTEGER;
  v_sent_today INTEGER;
BEGIN
  -- Get email configuration
  SELECT service_type, daily_limit INTO v_service_type, v_daily_limit
  FROM email_configurations
  WHERE organization_id = p_organization_id AND is_active = true;
  
  -- If dedicated server, no limit
  IF v_service_type = 'dedicated' THEN
    RETURN true;
  END IF;
  
  -- Count emails sent today
  SELECT COUNT(*) INTO v_sent_today
  FROM email_usage_logs
  WHERE organization_id = p_organization_id
    AND sent_at >= CURRENT_DATE
    AND status IN ('sent', 'delivered');
  
  RETURN v_sent_today < v_daily_limit;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE TRIGGER update_email_configurations_updated_at BEFORE UPDATE ON email_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();