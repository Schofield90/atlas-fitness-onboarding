-- Atlas Fitness CRM Database Schema
-- This extends the basic onboarding schema with full CRM capabilities

-- =============================================
-- AUTHENTICATION & ORGANIZATIONS
-- =============================================

-- Create organizations table for multi-tenant support
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'UK',
  timezone TEXT DEFAULT 'Europe/London',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create user profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- LEADS & PROSPECTS
-- =============================================

-- Create leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Lead Source & Campaign
  source TEXT NOT NULL DEFAULT 'unknown' CHECK (source IN ('facebook', 'google', 'instagram', 'website', 'referral', 'walk-in', 'phone', 'email', 'other', 'unknown')),
  campaign_id UUID, -- Will reference campaigns table
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Lead Status & Qualification
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'interested', 'not_interested', 'follow_up', 'converted', 'lost')),
  qualification_score INTEGER CHECK (qualification_score >= 0 AND qualification_score <= 100),
  ai_qualification JSONB, -- AI analysis results
  
  -- Lead Details
  interests TEXT[], -- Array of interests
  goals TEXT,
  budget_range TEXT,
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'whatsapp')),
  
  -- Tracking
  assigned_to UUID REFERENCES user_profiles(id),
  last_contacted TIMESTAMP WITH TIME ZONE,
  next_follow_up TIMESTAMP WITH TIME ZONE,
  conversion_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create lead activities table (interaction history)
CREATE TABLE lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),
  
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'sms', 'whatsapp', 'meeting', 'note', 'status_change', 'assignment', 'ai_qualification')),
  subject TEXT,
  content TEXT,
  outcome TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- CLIENTS & MEMBERSHIPS
-- =============================================

-- Create clients table (converted leads)
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id), -- Original lead if converted
  
  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  
  -- Address
  address TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'UK',
  
  -- Emergency Contact
  emergency_name TEXT,
  emergency_phone TEXT,
  emergency_relationship TEXT,
  
  -- Health Information
  medical_conditions TEXT,
  medications TEXT,
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  goals TEXT,
  
  -- Client Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'cancelled')),
  
  -- Tracking
  assigned_trainer UUID REFERENCES user_profiles(id),
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_visit TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create membership plans table
CREATE TABLE membership_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual', 'one_time')),
  
  -- Plan Features
  features TEXT[],
  access_level TEXT NOT NULL DEFAULT 'basic' CHECK (access_level IN ('basic', 'premium', 'vip')),
  
  -- Limits
  class_limit INTEGER, -- null = unlimited
  guest_passes INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create memberships table (client subscriptions)
CREATE TABLE memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES membership_plans(id),
  
  -- Membership Details
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Billing
  monthly_price DECIMAL(10, 2) NOT NULL,
  billing_date INTEGER CHECK (billing_date >= 1 AND billing_date <= 31),
  last_payment_date DATE,
  next_payment_date DATE,
  
  -- Usage Tracking
  classes_used INTEGER DEFAULT 0,
  guest_passes_used INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- CAMPAIGNS & MARKETING
-- =============================================

-- Create campaigns table
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('facebook', 'google', 'instagram', 'email', 'sms', 'whatsapp', 'referral', 'other')),
  
  -- Campaign Settings
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  budget DECIMAL(10, 2),
  start_date DATE,
  end_date DATE,
  
  -- Targeting
  target_audience JSONB,
  location_targeting TEXT[],
  age_range JSONB,
  interests TEXT[],
  
  -- Creative Assets
  headline TEXT,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  call_to_action TEXT,
  landing_page_url TEXT,
  
  -- Tracking
  created_by UUID REFERENCES user_profiles(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create campaign performance table
CREATE TABLE campaign_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Performance Metrics
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10, 2) DEFAULT 0,
  
  -- Calculated Metrics
  ctr DECIMAL(5, 4), -- Click-through rate
  cpc DECIMAL(10, 2), -- Cost per click
  cpl DECIMAL(10, 2), -- Cost per lead
  conversion_rate DECIMAL(5, 4),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(campaign_id, date)
);

-- =============================================
-- COMMUNICATIONS
-- =============================================

-- Create communication templates table
CREATE TABLE communication_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp', 'push')),
  subject TEXT, -- For email
  content TEXT NOT NULL,
  
  -- Template Variables
  variables JSONB DEFAULT '{}',
  
  -- Usage
  is_active BOOLEAN DEFAULT TRUE,
  category TEXT, -- e.g., 'welcome', 'follow_up', 'promotional'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create communication history table
CREATE TABLE communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Recipients
  lead_id UUID REFERENCES leads(id),
  client_id UUID REFERENCES clients(id),
  recipient_email TEXT,
  recipient_phone TEXT,
  
  -- Message Details
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp', 'push')),
  template_id UUID REFERENCES communication_templates(id),
  subject TEXT,
  content TEXT NOT NULL,
  
  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  sent_by UUID REFERENCES user_profiles(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- AUTOMATION & WORKFLOWS
-- =============================================

-- Create automation workflows table
CREATE TABLE automation_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('lead_created', 'lead_status_changed', 'client_joined', 'membership_expired', 'payment_failed', 'date_based', 'manual')),
  trigger_config JSONB DEFAULT '{}',
  
  -- Workflow Steps
  steps JSONB NOT NULL DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Statistics
  triggered_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create automation executions table
CREATE TABLE automation_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
  
  -- Execution Context
  lead_id UUID REFERENCES leads(id),
  client_id UUID REFERENCES clients(id),
  
  -- Execution Status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_step INTEGER DEFAULT 0,
  
  -- Execution Data
  context JSONB DEFAULT '{}',
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- =============================================
-- INDEXES
-- =============================================

-- Organization indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- User profile indexes
CREATE INDEX idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Lead indexes
CREATE INDEX idx_leads_organization ON leads(organization_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_email ON leads(email);

-- Lead activities indexes
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON lead_activities(created_at);

-- Client indexes
CREATE INDEX idx_clients_organization ON clients(organization_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_email ON clients(email);

-- Membership indexes
CREATE INDEX idx_memberships_client ON memberships(client_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_next_payment ON memberships(next_payment_date);

-- Campaign indexes
CREATE INDEX idx_campaigns_organization ON campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Communication indexes
CREATE INDEX idx_communications_organization ON communications(organization_id);
CREATE INDEX idx_communications_lead ON communications(lead_id);
CREATE INDEX idx_communications_client ON communications(client_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on requirements)
-- Users can only access data from their organization

CREATE POLICY "Users can access their organization's data" ON organizations
FOR ALL USING (
  id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can access their profile" ON user_profiles
FOR ALL USING (id = auth.uid() OR organization_id IN (
  SELECT organization_id FROM user_profiles 
  WHERE id = auth.uid()
));

-- Add similar policies for other tables
CREATE POLICY "Organization members can access leads" ON leads
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Organization members can access clients" ON clients
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_templates_updated_at BEFORE UPDATE ON communication_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON automation_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional - for development)
-- =============================================

-- Insert sample organization
INSERT INTO organizations (name, slug, description, phone, email, address, city, country) 
VALUES ('Atlas Fitness', 'atlas-fitness', 'Premium fitness center in York', '+44 1904 123456', 'info@atlasfitness.co.uk', 'Clifton Moor', 'York', 'UK');

-- Insert sample membership plans
INSERT INTO membership_plans (organization_id, name, description, price, billing_cycle, features, access_level) 
VALUES 
  ((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Basic Membership', 'Access to gym facilities', 29.99, 'monthly', '["Gym Access", "Locker Room"]', 'basic'),
  ((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Premium Membership', 'Gym access plus group classes', 49.99, 'monthly', '["Gym Access", "Group Classes", "Locker Room", "Nutritional Guidance"]', 'premium'),
  ((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'VIP Membership', 'Full access including personal training', 99.99, 'monthly', '["Gym Access", "Group Classes", "Personal Training", "Nutritional Guidance", "Priority Booking"]', 'vip');