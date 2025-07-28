-- Create leads table for storing form submissions
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Lead Details
  source TEXT DEFAULT 'embed_form',
  form_id TEXT,
  page_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Fitness Goals (customizable fields)
  fitness_goals TEXT[],
  preferred_location TEXT,
  preferred_time TEXT,
  current_fitness_level TEXT,
  interested_in TEXT[],
  
  -- Additional Data
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_form_id ON leads(form_id);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable insert for anon users (form submissions)" ON leads
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON leads
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create form_configurations table for storing different form setups
CREATE TABLE IF NOT EXISTS form_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  styling JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for form_configurations
ALTER TABLE form_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for anon users" ON form_configurations
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Enable all for authenticated users" ON form_configurations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);