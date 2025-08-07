-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Available variables like ["first_name", "last_name", "email"]
  type VARCHAR(100) DEFAULT 'custom', -- Changed from category to type to match page
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0, -- Added usage_count column
  performance_stats JSONB DEFAULT '{}'::jsonb, -- Track open rates, click rates etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's email templates" ON email_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create email templates for their organization" ON email_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's email templates" ON email_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization's email templates" ON email_templates
  FOR DELETE USING (
    organization_id IN (
      SELECT uo.organization_id 
      FROM user_organizations uo 
      WHERE uo.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE
  ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default templates
INSERT INTO email_templates (organization_id, name, subject, body, variables, type)
SELECT 
  o.id,
  'Welcome Email',
  'Welcome to {{gym_name}}, {{customer_name}}!',
  E'Hi {{customer_name}},\n\nWe\'re excited to have you join {{gym_name}}!\n\nYour fitness journey starts here. We noticed you\'re interested in {{interest}} and we have the perfect programs for you.\n\nNext steps:\n1. Book your free consultation\n2. Download our app\n3. Join our community\n\nLooking forward to seeing you soon!\n\nBest regards,\nThe {{gym_name}} Team',
  '["customer_name", "gym_name", "interest"]'::jsonb,
  'welcome'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.organization_id = o.id AND et.name = 'Welcome Email'
);

INSERT INTO email_templates (organization_id, name, subject, body, variables, type)
SELECT 
  o.id,
  'Follow Up - No Response',
  'Hey {{customer_name}}, still interested in {{gym_name}}?',
  E'Hi {{customer_name}},\n\nI noticed you showed interest in joining {{gym_name}} but haven\'t had a chance to visit yet.\n\nJust wanted to check in and see if you had any questions about:\n- Our membership options\n- Class schedules\n- Personal training\n\nWe\'re offering a special this week - reply "YES" and I\'ll send you the details!\n\nBest,\n{{sender_name}}',
  '["customer_name", "gym_name", "sender_name"]'::jsonb,
  'follow_up'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.organization_id = o.id AND et.name = 'Follow Up - No Response'
);