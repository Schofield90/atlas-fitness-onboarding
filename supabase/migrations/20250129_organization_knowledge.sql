-- Organization-specific knowledge base
CREATE TABLE IF NOT EXISTS organization_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('sop', 'faq', 'pricing', 'policies', 'services', 'schedule', 'style', 'location', 'staff', 'promotions')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Ensure unique content per type per organization
  UNIQUE(organization_id, type, content)
);

-- Create indexes
CREATE INDEX idx_org_knowledge_org_id ON organization_knowledge(organization_id);
CREATE INDEX idx_org_knowledge_type ON organization_knowledge(organization_id, type);
CREATE INDEX idx_org_knowledge_search ON organization_knowledge USING GIN(search_vector);

-- RLS policies
ALTER TABLE organization_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization knowledge"
  ON organization_knowledge FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Organization admins can manage knowledge"
  ON organization_knowledge FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Function to search organization knowledge
CREATE OR REPLACE FUNCTION search_organization_knowledge(
  org_id UUID,
  query_text TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  content TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ok.id,
    ok.type,
    ok.content,
    ts_rank(ok.search_vector, websearch_to_tsquery('english', query_text)) AS relevance
  FROM organization_knowledge ok
  WHERE 
    ok.organization_id = org_id
    AND ok.search_vector @@ websearch_to_tsquery('english', query_text)
  ORDER BY relevance DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Default knowledge templates for new organizations
CREATE TABLE IF NOT EXISTS knowledge_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Variables to replace like {{business_name}}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert some default templates
INSERT INTO knowledge_templates (type, name, template_content, variables) VALUES
('location', 'Main Location', 'We are located at {{address}}, {{city}}, {{postcode}}. {{parking_info}}', 
  '["address", "city", "postcode", "parking_info"]'::jsonb),
('schedule', 'Business Hours', 'We are open {{hours}}. {{special_hours}}',
  '["hours", "special_hours"]'::jsonb),
('pricing', 'Membership Pricing', 'Our {{membership_type}} membership is {{price}} per {{period}}. {{benefits}}',
  '["membership_type", "price", "period", "benefits"]'::jsonb),
('faq', 'Trial Session', 'Yes! We offer a {{trial_type}} trial for new members. {{trial_details}}',
  '["trial_type", "trial_details"]'::jsonb),
('policies', 'Cancellation Policy', 'We require {{notice_period}} notice for cancellations. {{cancellation_details}}',
  '["notice_period", "cancellation_details"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Function to initialize knowledge base for new organization
CREATE OR REPLACE FUNCTION initialize_organization_knowledge(
  org_id UUID,
  org_name TEXT
)
RETURNS void AS $$
BEGIN
  -- Add basic FAQ entries
  INSERT INTO organization_knowledge (organization_id, type, content) VALUES
  (org_id, 'faq', 'What are your opening hours?'),
  (org_id, 'faq', 'Do you offer a free trial?'),
  (org_id, 'faq', 'What equipment do you have?'),
  (org_id, 'faq', 'Do you have parking?'),
  (org_id, 'faq', 'Can I freeze my membership?')
  ON CONFLICT DO NOTHING;
  
  -- Add basic style guide
  INSERT INTO organization_knowledge (organization_id, type, content) VALUES
  (org_id, 'style', format('Always refer to the business as %s. Be friendly and professional.', org_name))
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize knowledge when organization is created
CREATE OR REPLACE FUNCTION init_org_knowledge_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_organization_knowledge(NEW.id, NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_knowledge_trigger
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION init_org_knowledge_trigger();